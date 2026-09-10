const express = require('express');
const app = express();
const PORT = 3000;

// 密码存储在服务器端，前端看不到
const CORRECT_PASSWORD = "nomad2026";

app.use(express.json());
app.use(express.static('public'));

app.post('/api/verify', (req, res) => {
    const { password } = req.body;
    if (password === CORRECT_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});