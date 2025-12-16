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
        console.log('Received submission request');
        
        // Parse request body
        let data;
        try {
            data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON' });
        }
        
        console.log('Student:', data.name);
        console.log('Score:', data.score);
        
        // Get Telegram credentials
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.warn('Telegram credentials not set in environment');
            return res.status(200).json({ 
                success: true, 
                message: 'Test recorded (Telegram not configured)',
                score: data.score 
            });
        }
        
        // Format time
        const minutes = Math.floor(data.time / 60);
        const seconds = data.time % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Create Telegram message
        const message = `
📝 *English Test Result*

👤 *Student:* ${data.name || 'Unknown'}
🏫 *Group:* ${data.group || 'Unknown'}
📊 *Score:* ${data.score}/20 (${data.percentage}%)
⏱️ *Time:* ${timeStr}
🚪 *Page Leaves:* ${data.leaves || 0}
📅 *Submitted:* ${new Date(data.timestamp).toLocaleString()}

${data.percentage >= 75 ? '✅ EXCELLENT' : data.percentage >= 50 ? '⚠️ AVERAGE' : '❌ NEEDS IMPROVEMENT'}
        `.trim();
        
        // Send to Telegram
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        try {
            const telegramRes = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const result = await telegramRes.json();
            
            if (!telegramRes.ok) {
                console.error('Telegram API error:', result);
            } else {
                console.log('Telegram message sent successfully');
            }
            
        } catch (telegramError) {
            console.error('Failed to send to Telegram:', telegramError);
        }
        
        // Return success
        return res.status(200).json({
            success: true,
            message: 'Test submitted successfully',
            score: data.score,
            telegram: botToken && chatId ? 'sent' : 'not configured'
        });
        
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
