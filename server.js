const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// МАКСИМАЛЬНО ЖИВУЧАЯ СТРОКА (БЕЗ SRV)
// Мы подключаемся напрямую к узлам кластера, обходя блокировки DNS
const mongoURI = "mongodb://mrgarderreddragon_db_user:RedDragon2028@cluster0-shard-00-00.yxx1kto.mongodb.net:27017,cluster0-shard-00-01.yxx1kto.mongodb.net:27017,cluster0-shard-00-02.yxx1kto.mongodb.net:27017/familyDB?ssl=true&replicaSet=atlas-yxx1kto-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log("⏳ Пытаюсь подключиться к MongoDB...");

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000, // Ждем максимум 10 секунд
    family: 4 // Принудительно используем IPv4 (часто помогает при кривых настройках провайдера)
})
.then(() => {
    console.log("✅✅✅ БАЗА ПОДКЛЮЧЕНА! СВЯЗЬ УСТАНОВЛЕНА!");
})
.catch(err => {
    console.log("❌ ОШИБКА ПОДКЛЮЧЕНИЯ К БАЗЕ:");
    console.error(err.message);
    console.log("-----------------------------------------");
    console.log("СОВЕТ: Если видишь 'timeout', раздай интернет с ТЕЛЕФОНА и перезапусти сервер.");
});

const Member = mongoose.model('Member', new mongoose.Schema({
    name: { type: String, unique: true },
    rank: String,
    warns: { type: Number, default: 0 },
    online: Boolean
}));

// ОБРАБОТКА СОХРАНЕНИЯ
app.post('/admin/update-member', async (req, res) => {
    const { password, name, online, rank, warns } = req.body;
    
    // Твой пароль админки
    if (password !== "01050302") {
        return res.status(403).send("Ошибка: Неверный пароль админа!");
    }
    if (!name) return res.status(400).send("Ошибка: Введите ник игрока!");

    try {
        const updated = await Member.findOneAndUpdate(
            { name: name.trim() }, 
            { rank, online: online === "true" || online === true, warns: parseInt(warns) || 0 }, 
            { upsert: true, new: true }
        );
        console.log(`✅ Игрок ${updated.name} обновлен в базе`);
        res.send("OK");
    } catch (e) {
        console.error("❌ Ошибка при записи в БД:", e.message);
        res.status(500).send("Ошибка базы данных: " + e.message);
    }
});

// ПОЛУЧЕНИЕ ВСЕХ ЧЛЕНОВ (ДЛЯ АДМИНКИ)
app.get('/admin/get-members', async (req, res) => {
    try {
        const members = await Member.find().sort({ name: 1 });
        res.json(members);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ПОЛУЧЕНИЕ ДЛЯ ОСНОВНОЙ СТРАНИЦЫ
app.get('/get-statuses', async (req, res) => {
    try {
        const members = await Member.find();
        const data = {};
        members.forEach(m => { 
            data[m.name] = { rank: m.rank, warns: m.warns, online: m.online }; 
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер взлетел на порту ${PORT}`);
    console.log(`🔗 Админка: http://localhost:${PORT}/admin.html`);
});