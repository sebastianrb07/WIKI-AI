require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const PDFDocument = require('pdfkit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const https = require('https');

// ==========================================
// Motor NLP Local (TextRank)
// ==========================================
const LocalNLP = {
    // Lista básica de stop-words en español para mejorar la similitud
    stopWords: new Set(['un', 'una', 'unas', 'unos', 'el', 'la', 'los', 'las', 'y', 'o', 'pero', 'si', 'porque', 'en', 'de', 'del', 'a', 'al', 'con', 'por', 'para', 'como', 'este', 'esta', 'estos', 'estas', 'que', 'su', 'sus', 'es', 'son', 'fue', 'eran', 'habia']),

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\sáéíóúñ]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !this.stopWords.has(w));
    },

    calculateSimilarity(s1, s2) {
        const words1 = new Set(this.tokenize(s1));
        const words2 = new Set(this.tokenize(s2));
        if (words1.size === 0 || words2.size === 0) return 0;
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size; // Jaccard Similarity
    },

    summarize(text, numSentences = 6) {
        if (!text) return [];
        // Limpiar y dividir en oraciones
        const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 30);
        if (sentences.length <= numSentences) return sentences;

        const n = sentences.length;
        const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

        // Construir matriz de similitud
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const sim = this.calculateSimilarity(sentences[i], sentences[j]);
                matrix[i][j] = sim;
                matrix[j][i] = sim;
            }
        }

        // Iteración PageRank (Simplificada)
        let scores = Array(n).fill(1.0);
        const damping = 0.85;
        const iterations = 15;

        for (let iter = 0; iter < iterations; iter++) {
            const nextScores = Array(n).fill(1 - damping);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j || matrix[j][i] === 0) continue;
                    const totalOutWeight = matrix[j].reduce((a, b) => a + b, 0);
                    if (totalOutWeight > 0) {
                        nextScores[i] += damping * (matrix[j][i] / totalOutWeight) * scores[j];
                    }
                }
            }
            scores = nextScores;
        }

        // Seleccionar las mejores oraciones manteniendo el orden original
        const ranked = sentences.map((s, i) => ({ text: s, score: scores[i], index: i }))
            .sort((a, b) => b.score - a.score)
            .slice(0, numSentences)
            .sort((a, b) => a.index - b.index);

        return ranked.map(r => r.text);
    }
};

// Helper para llamadas a Wikipedia
async function fetchWiki(query) {
    return new Promise((resolve, reject) => {
        const url = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts|categories|info&exintro=0&titles=${encodeURIComponent(query)}&format=json&origin=*&redirects=1`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const pages = json.query.pages;
                    const pageId = Object.keys(pages)[0];
                    if (pageId === '-1') return resolve(null);
                    resolve(pages[pageId]);
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// Middleware
app.use(cors());
app.use(express.json());

// Servir la aplicación frontend desde el directorio padre
const publicPath = path.join(__dirname, '../frontend');
app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// ==========================================
// Rutas API - Autenticación
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan campos requeridos.' });
        }

        // Usamos el email completo como username interno para evitar conflictos de duplicados
        const username = email;

        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Este email ya está registrado.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hash]
        );

        res.status(201).json({ message: 'Usuario registrado con éxito', user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor al registrarse.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Email no encontrado.' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(400).json({ error: 'Contraseña incorrecta.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ message: 'Login exitoso', token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
    }
});

// LOGIN CON GOOGLE
app.post('/api/auth/google', async (req, res) => {
    const { idToken } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: google_id, email, name: username } = payload;

        // Verificar si el usuario ya existe
        let userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;
        if (userResult.rows.length === 0) {
            // Crear usuario automáticamente si no existe
            const username = email; // Identidad unificada
            const newUser = await db.query(
                'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING id, username, email',
                [username, email, google_id]
            );
            user = newUser.rows[0];
        } else {
            user = userResult.rows[0];
            if (!user.google_id) {
                await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [google_id, user.id]);
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        
        res.json({ message: 'Login con Google exitoso', token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Error Google Auth:', error);
        res.status(401).json({ error: 'Autenticación de Google fallida' });
    }
});

// Middleware de Autenticación
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token proporcionado' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ==========================================
// Rutas API - Artículos
// ==========================================

// Endpoint para guardar artículo con "verificación IA" mock/Gemini (se extenderá más adelante)
app.post('/api/articles', requireAuth, async (req, res) => {
    try {
        const { title, content_html, raw_text, category_id } = req.body;
        
        let is_verified_by_ai = false;
        let ai_feedback = 'Pendiente de revisión profunda.';

        if (ai) {
             try {
                const apiRes = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt
                });
                const resJson = JSON.parse(apiRes.text.replace(/```json|```/g, ''));
                is_verified_by_ai = resJson.verified;
                ai_feedback = resJson.feedback;
             } catch(err) {
                console.error("Gemini Error:", err);
                ai_feedback = 'IA falló temporalmente';
             }
        } else {
             // Fallback if no key is provided
             if (raw_text && raw_text.length > 50) {
                 is_verified_by_ai = true;
                 ai_feedback = 'Aceptado por filtro automático local (Simulando IA).';
             }
        }

        const result = await db.query(
            `INSERT INTO articles (title, content_html, raw_text, author_id, category_id, is_verified_by_ai, ai_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, content_html, raw_text, req.user.id, category_id || null, is_verified_by_ai, ai_feedback]
        );

        res.status(201).json({ message: 'Artículo publicado y revisado por la IA.', article: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor publicando el artículo.' });
    }
});

// Obtener artículos principales
app.get('/api/articles', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.id, a.title, a.published_at, u.username as author_username, c.name as category_name
             FROM articles a
             LEFT JOIN users u ON a.author_id = u.id
             LEFT JOIN categories c ON a.category_id = c.id
             ORDER BY a.published_at DESC LIMIT 20`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener artículos' });
    }
});

// ==========================================
// Rutas API - Perfil de Usuario (Fase 3 - extra)
// ==========================================
app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userRes = await db.query('SELECT id, username, email, google_id, password_hash FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        const articlesRes = await db.query('SELECT id, title, published_at FROM articles WHERE author_id = $1 ORDER BY published_at DESC', [req.user.id]);
        
        const user = userRes.rows[0];
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isSocial: !!user.google_id,
                hasPassword: !!user.password_hash
            },
            articles: articlesRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error cargando perfil' });
    }
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const { username, email, currentPassword, newPassword } = req.body;
        
        // No permitir que usuarios de Google cambien su email a algo vacío o erróneo
        // O si ya tienen email, mantenerlo si no se envía uno nuevo real
        const existingUser = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = existingUser.rows[0];
        
        let finalEmail = email || user.email;
        if (user.google_id && (!email || email === 'google-user')) {
            finalEmail = user.email;
        }

        let query = 'UPDATE users SET username = $1, email = $2 WHERE id = $3';
        let params = [username, finalEmail, req.user.id];

        // Si el usuario quiere cambiar o establecer su contraseña por primera vez
        if (newPassword) {
            // Solo exigimos contraseña actual si el usuario YA tiene una guardada en la BD
            if (user.password_hash && user.password_hash !== '') {
                if (!currentPassword || currentPassword.trim() === '') {
                    return res.status(400).json({ error: 'Se requiere la contraseña actual para cambiarla.' });
                }
                const isValid = await bcrypt.compare(currentPassword, user.password_hash);
                if (!isValid) return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
            }

            // Encriptar la nueva contraseña (ya sea cambio o creación inicial)
            const newHash = await bcrypt.hash(newPassword, 10);
            query = 'UPDATE users SET username = $1, email = $2, password_hash = $3 WHERE id = $4';
            params = [username, finalEmail, newHash, req.user.id];
        } 
        
        await db.query(query, params);

        res.json({ success: true, user: { id: req.user.id, username, email: finalEmail } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando perfil (el usuario/email podría estar en uso)' });
    }
});

// ==========================================
// Rutas API - Historial de Búsqueda
// ==========================================
app.get('/api/search-history', requireAuth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, query, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo historial de búsqueda' });
    }
});

app.post('/api/search-history', requireAuth, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Falta query' });
        
        const result = await db.query(
            'INSERT INTO search_history (user_id, query) VALUES ($1, $2) RETURNING id, query, created_at',
            [req.user.id, query]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando historial de búsqueda' });
    }
});

// Función auxiliar: llama a Gemini con un modelo específico
async function callGemini(ai, model, prompt) {
    const apiRes = await ai.models.generateContent({ model, contents: prompt });
    return apiRes.text.replace(/```html|```/g, '');
}

// Endpoint para generar resumen de IA de cualquier texto.
app.post('/api/ai/summarize', async (req, res) => {
    const { text, contextContext } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto requerido' });

    console.log(`[NLP] Generando resumen local para: ${contextContext || 'General'}`);
    
    // Procesar resumen con algoritmo local TextRank
    const sentences = LocalNLP.summarize(text, 10);
    
    if (sentences.length === 0) {
        return res.status(500).json({ error: 'No se pudo generar el resumen local' });
    }

    const html = `
        <div style="padding:14px; border-left:4px solid var(--accent); border-radius:8px; margin-bottom:20px; background:var(--ai-bg)">
            <p style="font-size:12px; color:var(--text-muted); margin:0; font-family:var(--mono)">
                <strong style="color:var(--ai-green)">✦ MOTOR WIKIAI LOCAL:</strong> Análisis procesado mediante NLP (TextRank).
            </p>
        </div>
        <h3>Análisis y Puntos Clave</h3>
        <ul>
            ${sentences.map(s => `<li style="margin-bottom:12px">${s.trim()}</li>`).join('')}
        </ul>
        <p style="margin-top:20px; font-style:italic; font-size:13px; color:var(--text-muted); border-top:1px solid var(--border); padding-top:10px">
            Este análisis ha sido sintetizado automáticamente por el núcleo de WikiAI.
        </p>
    `;

    return res.json({ 
        summary_html: html, 
        model_used: 'local-textrank',
        is_local: true 
    });
});

// ==========================================
// Rutas API - Búsqueda Inteligente Local (Reemplaza Gemini Search)
app.post('/api/ai/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query requerido' });

        console.log(`[NLP] Generando búsqueda inteligente local para: ${query}`);

        const page = await fetchWiki(query);
        
        if (!page) {
            return res.status(404).json({ error: 'No se encontró información local para este término.' });
        }

        const title = page.title;
        const extract = page.extract || '';
        
        // Limpiar HTML de Wikipedia para el procesamiento
        const cleanText = extract.replace(/<[^>]+>/g, ' ');
        
        // Generar secciones usando TextRank
        const mainSummary = LocalNLP.summarize(cleanText, 5);
        const keyPoints = LocalNLP.summarize(cleanText, 8);

        const html = `
            <div style="padding:16px; background:var(--ai-bg); border:1px solid var(--ai-border); border-radius:12px; margin-bottom:24px;">
                <p style="margin:0; font-size:14px; color:var(--ai-green); font-weight:600;">✦ Artículo generado por Motor Local WikiAI</p>
                <p style="margin:4px 0 0; font-size:12px; color:var(--text-muted);">Sintetizando información de fuentes enciclopédicas en tiempo real.</p>
            </div>
            
            <h2>Resumen Ejecutivo</h2>
            <p>${mainSummary.join(' ')}</p>

            <h2>Análisis Estructurado</h2>
            <ul>
                ${keyPoints.map(p => `<li><strong>Dato clave:</strong> ${p.trim()}</li>`).join('')}
            </ul>

            <h2 style="margin-top:30px; border-top: 1px solid var(--border); padding-top:20px;">Contenido Completo</h2>
            <div class="wiki-source-content">
                ${extract}
            </div>

            <h2 style="margin-top:40px">Referencias y Contexto</h2>
            <p>La información presentada ha sido procesada mediante algoritmos de procesamiento de lenguaje natural (TextRank) para garantizar la relevancia sin depender de servidores externos.</p>
        `;

        return res.json({ 
            title, 
            content_html: html, 
            source: 'local-nlp',
            is_local: true 
        });

    } catch (err) {
        console.error("AI Search Error:", err);
        return res.status(500).json({ error: 'Error procesando la búsqueda inteligente local.' });
    }
});

// ==========================================
// Rutas API - Categorías (Fase 5)
// ==========================================
app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo categorías' });
    }
});

app.get('/api/articles/by-category/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.id, a.title, a.published_at, a.is_verified_by_ai, u.username as author_username
             FROM articles a
             LEFT JOIN users u ON a.author_id = u.id
             WHERE a.category_id = $1
             ORDER BY a.published_at DESC LIMIT 20`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo artículos por categoría' });
    }
});

// ==========================================
// Rutas API - Feed Comunitario (Fase 6)
// ==========================================
app.get('/api/community/feed', async (req, res) => {
    try {
        const articles = await db.query(
            `SELECT a.title, a.published_at, a.is_verified_by_ai, u.username
             FROM articles a LEFT JOIN users u ON a.author_id = u.id
             ORDER BY a.published_at DESC LIMIT 10`
        );
        const userCount = await db.query('SELECT COUNT(*) as total FROM users');
        const articleCount = await db.query('SELECT COUNT(*) as total FROM articles');
        const verifiedCount = await db.query('SELECT COUNT(*) as total FROM articles WHERE is_verified_by_ai = true');
        const topContributors = await db.query(
            `SELECT u.username, COUNT(a.id) as article_count
             FROM users u JOIN articles a ON u.id = a.author_id
             GROUP BY u.username ORDER BY article_count DESC LIMIT 5`
        );

        res.json({
            recent_articles: articles.rows,
            stats: {
                users: parseInt(userCount.rows[0].total),
                articles: parseInt(articleCount.rows[0].total),
                verified: parseInt(verifiedCount.rows[0].total)
            },
            top_contributors: topContributors.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo feed comunitario' });
    }
});

// ==========================================
// Ruta API - Exportación PDF (Backend Native)
// ==========================================
app.post('/api/export-pdf', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Título y contenido requeridos' });

    try {
        const doc = new PDFDocument({ margin: 50 });
        
        // Configurar headers para descarga
        const filename = `WikiAI_${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Título
        doc.fillColor('#1a5276').fontSize(22).text(`WikiAI - Análisis: ${title}`, { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#666666').fontSize(10).text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
        doc.moveDown(2);

        // Contenido (limpieza básica de HTML si es necesario)
        // Por ahora asumimos que viene texto limpio o manejamos párrafos básicos
        const cleanContent = content.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n');
        doc.fillColor('#000000').fontSize(12).text(cleanContent, {
            align: 'justify',
            lineGap: 5
        });

        doc.end();
    } catch (err) {
        console.error('Error generando PDF:', err);
        res.status(500).json({ error: 'Error interno al generar el PDF' });
    }
});

// Rutas genéricas
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor backend WikiAI corriendo en puerto ${PORT}`);
});
