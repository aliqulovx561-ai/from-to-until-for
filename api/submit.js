import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        let data;
        
        // Parse request body
        if (typeof req.body === 'string') {
            data = JSON.parse(req.body);
        } else if (req.body) {
            data = req.body;
        } else {
            return res.status(400).json({ error: 'No data provided' });
        }
        
        // Get Telegram credentials from environment
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error('Missing Telegram credentials');
            return res.status(200).json({ 
                success: true, 
                warning: 'Telegram not configured',
                score: data.score || 'N/A'
            });
        }
        
        // Prepare Telegram message
        const timeTaken = data.timeTaken || 0;
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        
        const message = `
📚 *NEW TEST SUBMISSION*

👤 *Student:* ${data.studentName || 'Unknown'}
🏫 *Group:* ${data.studentGroup || 'Unknown'}
⏱️ *Time Taken:* ${minutes}:${seconds.toString().padStart(2, '0')}
📊 *Score:* ${data.score || 0}/20 (${data.percentage?.toFixed(1) || 0}%)
🚪 *Page Leaves:* ${data.pageLeaves || 0}
📅 *Submitted:* ${new Date(data.submittedAt || Date.now()).toLocaleString()}

${data.percentage >= 75 ? '✅ EXCELLENT!' : data.percentage >= 50 ? '⚠️ NEEDS PRACTICE' : '❌ NEEDS IMPROVEMENT'}

*Answer Summary:*
${Array.from({length: 20}, (_, i) => {
    const q = `q${i + 1}`;
    const answer = data.answers?.[q] || 'No answer';
    const correct = answer === getCorrectAnswer(i + 1);
    return `Q${i + 1}: ${answer} ${correct ? '✅' : '❌'}`;
}).join(' | ')}
        `.trim();
        
        // Helper function for correct answers
        function getCorrectAnswer(questionNum) {
            const key = {
                1: 'b', 2: 'd', 3: 'c', 4: 'c', 5: 'c',
                6: 'b', 7: 'd', 8: 'b', 9: 'c', 10: 'b',
                11: 'b', 12: 'c', 13: 'd', 14: 'd', 15: 'b',
                16: 'b', 17: 'c', 18: 'b', 19: 'b', 20: 'c'
            };
            return key[questionNum] || '?';
        }
        
        // Send to Telegram
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        const telegramResult = await telegramResponse.json();
        
        if (!telegramResponse.ok) {
            console.error('Telegram error:', telegramResult);
        }
        
        // Return success to client
        return res.status(200).json({
            success: true,
            telegramSent: telegramResponse.ok,
            score: data.score || 0,
            percentage: data.percentage?.toFixed(1) || 0,
            message: 'Test submitted successfully'
        });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(200).json({
            success: true,
            error: error.message,
            message: 'Test recorded locally'
        });
    }
}
