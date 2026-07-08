const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3000;

const DB_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(__dirname, 'data', 'lottery_data.json');

try {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log('数据目录已创建:', DB_DIR);
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            drawData: [],
            patterns: [],
            positionStats: {},
            analysisHistory: [],
            trainingStatus: { completed: false, lastPeriod: '' },
            dataLake: [],
            splitConfig: null
        }, null, 2));
        console.log('数据文件已创建:', DATA_FILE);
    }
} catch (e) {
    console.error('无法创建数据目录或文件:', e.message);
    process.exit(1);
}

console.log('脚本位置:', __dirname);
console.log('数据目录:', DB_DIR);
console.log('数据文件:', DATA_FILE);

let dataStore = {
    drawData: [],
    patterns: [],
    positionStats: {},
    analysisHistory: [],
    trainingStatus: { completed: false, lastPeriod: '' },
    dataLake: [],
    splitConfig: null
};

function transformDrawData(drawData) {
    if (!drawData || !Array.isArray(drawData)) return [];
    
    return drawData.map(function(item) {
        if (item.back3 && item.mid3 && item.front3) return item;
        
        var num = item.num || item.number || '';
        if (num.length >= 5) {
            return {
                ...item,
                back3: num.substring(2, 5),
                mid3: num.substring(1, 4),
                front3: num.substring(0, 3),
                digits: num.split('').map(Number),
                sum: num.split('').reduce(function(a, b) { return a + parseInt(b); }, 0)
            };
        }
        return item;
    });
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            dataStore = JSON.parse(raw);
            
            if (dataStore.drawData) {
                dataStore.drawData = transformDrawData(dataStore.drawData);
            }
            
            const MAX_PATTERNS = 10000;
            if (dataStore.patterns && dataStore.patterns.length > MAX_PATTERNS) {
                const removed = dataStore.patterns.length - MAX_PATTERNS;
                dataStore.patterns = dataStore.patterns.slice(-MAX_PATTERNS);
                console.log('模式库超过限制(' + MAX_PATTERNS + ')，已清理', removed, '条旧模式');
                saveData();
            }
            
            console.log('数据已加载:', DATA_FILE);
            console.log('  开奖数据:', dataStore.drawData.length, '条');
            console.log('  模式库:', dataStore.patterns.length, '条');
            console.log('  位置统计:', Object.keys(dataStore.positionStats).length, '个');
        } else {
            saveData();
            console.log('数据文件已创建:', DATA_FILE);
        }
    } catch (e) {
        console.error('加载数据失败:', e.message);
    }
}

function saveData() {
    if (dataStore.drawData) {
        dataStore.drawData = transformDrawData(dataStore.drawData);
    }
    
    const json = JSON.stringify(dataStore, null, 2);
    
    const savePaths = [
        DATA_FILE,
        path.join(__dirname, 'lottery_data.json'),
        'C:/lottery_data.json',
        'C:/Users/Administrator/lottery_data.json'
    ];
    
    for (let i = 0; i < savePaths.length; i++) {
        try {
            fs.writeFileSync(savePaths[i], json, 'utf8');
            console.log('[数据保存] 成功，模式库:', dataStore.patterns.length, '条，路径:', savePaths[i]);
            return true;
        } catch (e) {
            console.warn('[数据保存] 尝试', i + 1, '失败:', savePaths[i], '-', e.message);
        }
    }
    
    console.error('[数据保存] 所有尝试均失败，数据可能未保存');
    return false;
}

loadData();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/api/draw-data', (req, res) => {
    res.json(dataStore.drawData || []);
});

app.post('/api/draw-data', (req, res) => {
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    const periodMap = {};
    (dataStore.drawData || []).forEach(item => {
        periodMap[item.period] = item;
    });
    data.forEach(item => {
        periodMap[item.period] = item;
    });
    dataStore.drawData = Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));
    
    saveData();
    res.json({ success: true, count: dataStore.drawData.length });
});

app.get('/api/patterns', (req, res) => {
    res.json(dataStore.patterns || []);
});

app.post('/api/patterns', (req, res) => {
    const patterns = req.body;
    if (!Array.isArray(patterns)) {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    dataStore.patterns = patterns;
    saveData();
    res.json({ success: true, count: patterns.length });
});

app.get('/api/trend-patterns', (req, res) => {
    res.json(dataStore.trendPatterns || []);
});

app.post('/api/trend-patterns', (req, res) => {
    const patterns = req.body;
    if (!Array.isArray(patterns)) {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    dataStore.trendPatterns = patterns;
    saveData();
    res.json({ success: true, count: patterns.length });
});

app.get('/api/position-stats', (req, res) => {
    res.json(dataStore.positionStats || {});
});

app.post('/api/position-stats', (req, res) => {
    const stats = req.body;
    if (!stats || typeof stats !== 'object') {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    dataStore.positionStats = stats;
    saveData();
    res.json({ success: true, count: Object.keys(stats).length });
});

app.get('/api/pattern-generate-stats', (req, res) => {
    res.json(dataStore.patternGenerateStats || {
        generateCount: 0,
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        currentStreak: 0,
        maxWinStreak: 0,
        maxLossStreak: 0,
        lastGeneratedNumbers: [],
        lastGeneratedIssue: '',
        recentHistory: []
    });
});

app.post('/api/pattern-generate-stats', (req, res) => {
    const stats = req.body;
    if (!stats || typeof stats !== 'object') {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    dataStore.patternGenerateStats = stats;
    saveData();
    res.json({ success: true });
});

app.get('/api/analysis-history', (req, res) => {
    res.json((dataStore.analysisHistory || []).slice(0, 100));
});

app.post('/api/analysis-history', (req, res) => {
    const history = req.body;
    if (!Array.isArray(history)) {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    dataStore.analysisHistory = history;
    saveData();
    res.json({ success: true, count: history.length });
});

app.get('/api/training-status', (req, res) => {
    res.json(dataStore.trainingStatus || { completed: false, lastPeriod: '' });
});

app.post('/api/training-status', (req, res) => {
    const { completed, lastPeriod } = req.body;
    dataStore.trainingStatus = {
        completed: completed || false,
        lastPeriod: lastPeriod || ''
    };
    saveData();
    res.json({ success: true });
});

app.get('/api/data-lake', (req, res) => {
    res.json(dataStore.dataLake || []);
});

app.post('/api/data-lake', (req, res) => {
    const dataLake = req.body;
    if (!Array.isArray(dataLake)) {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }
    dataStore.dataLake = dataLake;
    saveData();
    res.json({ success: true, count: dataLake.length });
});

app.get('/api/split-config', (req, res) => {
    res.json(dataStore.splitConfig || null);
});

app.post('/api/split-config', (req, res) => {
    const splitConfig = req.body;
    if (!splitConfig || typeof splitConfig !== 'object') {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }
    dataStore.splitConfig = splitConfig;
    saveData();
    res.json({ success: true });
});

app.get('/api/export', (req, res) => {
    const result = {
        ...dataStore,
        exportTime: Date.now()
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=lottery_backup.json');
    res.send(JSON.stringify(result, null, 2));
});

app.post('/api/import', (req, res) => {
    const data = req.body;
    if (!data || typeof data !== 'object') {
        res.status(400).json({ error: '数据格式错误' });
        return;
    }

    if (data.drawData) dataStore.drawData = data.drawData;
    if (data.patterns) dataStore.patterns = data.patterns;
    if (data.positionStats) dataStore.positionStats = data.positionStats;
    if (data.analysisHistory) dataStore.analysisHistory = data.analysisHistory;
    if (data.trainingStatus) dataStore.trainingStatus = data.trainingStatus;

    saveData();
    res.json({ success: true });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dataFile: DATA_FILE, drawDataCount: dataStore.drawData.length });
});

app.get('/api/proxy', (req, res) => {
    const url = req.query.url;
    if (!url) {
        res.status(400).json({ error: 'URL参数缺失' });
        return;
    }

    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            res.setHeader('Content-Type', response.headers['content-type'] || 'application/json');
            res.send(data);
        });
    }).on('error', (error) => {
        console.error('代理请求失败:', error.message);
        res.status(500).json({ error: '代理请求失败: ' + error.message });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  瞌睡虫V5趋势分析 - 后端服务');
    console.log('========================================');
    console.log('  服务地址: http://localhost:' + PORT);
    console.log('  数据目录: ' + DB_DIR);
    console.log('  数据文件: ' + DATA_FILE);
    console.log('========================================');
    console.log('  请在浏览器中打开: http://localhost:' + PORT);
    console.log('========================================');
});
