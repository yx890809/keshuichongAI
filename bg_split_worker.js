var drawData = [];
var aiPatterns = [];

self.onmessage = function(e) {
    var cmd = e.data.cmd;
    
    if (cmd === 'init') {
        drawData = e.data.drawData || [];
        aiPatterns = e.data.aiPatterns || [];
        console.log('[Worker] 初始化完成，drawData:', drawData.length, '条，aiPatterns:', aiPatterns.length, '条');
    } else if (cmd === 'split') {
        var lastIdx = e.data.lastIdx;
        var prevIdx = e.data.prevIdx;
        
        if (drawData.length === 0) {
            self.postMessage({ type: 'complete', success: false, message: 'drawData为空，无法分割' });
            return;
        }
        
        if (aiPatterns.length === 0) {
            console.warn('[Worker] aiPatterns为空，将使用随机选择');
        }
        
        executeSplit(lastIdx, prevIdx);
    } else if (cmd === 'updatePatterns') {
        aiPatterns = e.data.patterns || [];
        console.log('[Worker] 模式库更新，aiPatterns:', aiPatterns.length, '条');
    }
};

function executeSplit(lastIdx, prevIdx) {
    console.log('[Worker] 开始执行分割，drawData:', drawData.length, '条，prevIdx:', prevIdx, 'lastIdx:', lastIdx);
    
    if (drawData.length <= prevIdx) {
        console.error('[Worker] drawData长度不足:', drawData.length, '需要至少:', prevIdx + 1);
        self.postMessage({ type: 'complete', success: false, message: '数据不足' });
        return;
    }
    
    console.log('[Worker] 验证数据:', drawData[prevIdx], drawData[lastIdx]);
    
    self.postMessage({ type: 'progress', text: '正在搜索4连挂号码组...', progress: 0 });
    
    var allNumbers = [];
    for (var i = 0; i < 1000; i++) allNumbers.push(i);
    
    var results = [];
    var maxIterations = 100000;
    var batchSize = 500;
    var currentIter = 0;
    var targetCount = 100;
    var foundInBatch = 0;
    
    function doBatch() {
        foundInBatch = 0;
        
        for (var b = 0; b < batchSize && currentIter < maxIterations && results.length < targetCount; b++) {
            currentIter++;
            var shuffled = allNumbers.slice().sort(function() { return Math.random() - 0.5; });
            var groups = createGroups(8, shuffled);
            
            for (var g = 0; g < groups.length; g++) {
                if (results.length >= targetCount) break;
                var missStreak = checkMissStreakUpTo(groups[g], drawData, prevIdx);
                if (missStreak === 4) {
                    results.push({ group: groups[g], missStreak: missStreak });
                    foundInBatch++;
                }
            }
        }
        
        console.log('[Worker] 批次完成: 当前迭代', currentIter, '找到', results.length, '组，本批新增', foundInBatch);
        
        var pct = Math.round((results.length / targetCount) * 100);
        self.postMessage({ type: 'progress', text: '正在搜索4连挂号码组...', progress: pct, count: results.length, iter: currentIter });
        
        if (results.length >= targetCount || currentIter >= maxIterations) {
            finishStep1(results, lastIdx);
        } else {
            setTimeout(doBatch, 0);
        }
    }
    
    doBatch();
}

function finishStep1(results, lastIdx) {
    self.postMessage({ type: 'progress', text: '正在用上期开奖号过滤5连挂组...', progress: 80 });
    
    if (results.length === 0) {
        self.postMessage({ type: 'complete', success: false, message: '未找到4连挂号码组' });
        return;
    }
    
    var lastDrawNum = getPosNum(drawData[lastIdx].num);
    var fiveMissGroups = [];
    
    for (var i = 0; i < results.length; i++) {
        var set = {};
        for (var j = 0; j < results[i].group.length; j++) set[results[i].group[j]] = true;
        if (!set[lastDrawNum]) {
            var streak = checkMissStreakUpTo(results[i].group, drawData, lastIdx);
            if (streak === 5) {
                fiveMissGroups.push({ group: results[i].group, missStreak: streak });
            }
        }
    }
    
    if (fiveMissGroups.length === 0) {
        self.postMessage({ type: 'complete', success: false, message: '无恰好5连挂组' });
        return;
    }
    
    self.postMessage({ type: 'progress', text: '正在选取最优组...', progress: 90 });
    
    var bestGroup = selectBestBgGroup(fiveMissGroups);
    
    self.postMessage({
        type: 'complete',
        success: true,
        bestGroup: bestGroup,
        fiveMissCount: fiveMissGroups.length,
        fourMissCount: results.length
    });
}

function createGroups(count, numbers) {
    var groups = [];
    var excludePerGroup = Math.floor(numbers.length / count);
    var includePerGroup = numbers.length - excludePerGroup;
    
    var shuffled = numbers.slice().sort(function() { return Math.random() - 0.5; });
    
    for (var i = 0; i < count; i++) {
        var excludeStart = i * excludePerGroup;
        var excludeEnd = (i === count - 1) ? numbers.length : (i + 1) * excludePerGroup;
        var excludeSet = {};
        for (var j = excludeStart; j < excludeEnd; j++) {
            excludeSet[shuffled[j]] = true;
        }
        
        var group = [];
        for (var k = 0; k < numbers.length; k++) {
            if (!excludeSet[numbers[k]]) {
                group.push(numbers[k]);
            }
        }
        groups.push(group);
    }
    
    return groups;
}

function getPosNum(num) {
    if (!num) return '';
    var numStr = String(num);
    if (numStr.length >= 5) {
        return parseInt(numStr.substring(2), 10);
    }
    return parseInt(numStr, 10);
}

function checkMissStreakUpTo(group, data, endIdx) {
    var missStreak = 0;
    
    for (var i = endIdx; i >= 0 && missStreak < 6; i--) {
        var item = data[i];
        if (!item) break;
        
        var drawNum = getPosNum(item.num);
        
        var hit = false;
        for (var j = 0; j < group.length; j++) {
            if (group[j] === drawNum || String(group[j]) === String(drawNum)) {
                hit = true;
                break;
            }
        }
        
        if (!hit) {
            missStreak++;
        } else {
            break;
        }
    }
    
    return missStreak;
}

function selectBestBgGroup(fiveMissGroups) {
    if (fiveMissGroups.length === 0) return null;
    if (aiPatterns.length === 0) return fiveMissGroups[0].group;
    
    console.log('[Worker] 开始评分，5连挂组数:', fiveMissGroups.length, '模式库:', aiPatterns.length, '条');
    
    var scored = fiveMissGroups.map(function(r) {
        var avgScore = 0;
        var count = 0;
        for (var i = 0; i < Math.min(10, r.group.length); i++) {
            var num = r.group[i].toString().padStart(3, '0');
            var numFeatures = extractSingleNumberFeatures(num);
            for (var p = 0; p < aiPatterns.length; p++) {
                var pattern = aiPatterns[p];
                if (pattern.features && pattern.features.length > 0) {
                    avgScore += calculateWeightedDistance(numFeatures, pattern.features) * (pattern.priority || 1);
                    count++;
                }
            }
        }
        avgScore = count > 0 ? avgScore / count : 0;
        return { group: r.group, score: avgScore, missStreak: r.missStreak };
    });
    
    scored.sort(function(a, b) { return b.score - a.score; });
    
    console.log('[Worker] 评分完成，最高评分:', scored[0].score);
    
    return scored[0].group;
}

function calculateWeightedDistance(features1, features2) {
    if (!features1 || !features2) return 0;
    
    var distance = 0;
    
    if (features1[0] !== undefined && features2[0] !== undefined) {
        distance += Math.abs(features1[0] - features2[0]) * 0.24;
    }
    if (features1[1] !== undefined && features2[1] !== undefined) {
        distance += Math.abs(features1[1] - features2[1]) * 0.20;
    }
    if (features1[2] !== undefined && features2[2] !== undefined) {
        distance += Math.abs(features1[2] - features2[2]) * 0.20;
    }
    if (features1[3] !== undefined && features2[3] !== undefined) {
        distance += Math.abs(features1[3] - features2[3]) * 0.10;
    }
    if (features1[4] !== undefined && features2[4] !== undefined) {
        distance += Math.abs(features1[4] - features2[4]) * 0.05;
    }
    if (features1[5] !== undefined && features2[5] !== undefined) {
        distance += Math.abs(features1[5] - features2[5]) * 0.05;
    }
    if (features1[6] !== undefined && features2[6] !== undefined) {
        distance += Math.abs(features1[6] - features2[6]) * 0.03;
    }
    if (features1[7] !== undefined && features2[7] !== undefined) {
        distance += Math.abs(features1[7] - features2[7]) * 0.03;
    }
    if (features1[8] !== undefined && features2[8] !== undefined) {
        distance += Math.abs(features1[8] - features2[8]) * 0.05;
    }
    if (features1[9] !== undefined && features2[9] !== undefined) {
        distance += Math.abs(features1[9] - features2[9]) * 0.05;
    }
    
    var similarity = 1 / (1 + distance);
    return similarity;
}

function extractSingleNumberFeatures(number) {
    if (!number) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    var numStr = String(number).padStart(3, '0');
    var d1 = parseInt(numStr[0], 10);
    var d2 = parseInt(numStr[1], 10);
    var d3 = parseInt(numStr[2], 10);
    
    var sum = d1 + d2 + d3;
    var avg = sum / 3;
    
    var hotScore = 0;
    if (d1 >= 5) hotScore += 0.5;
    if (d2 >= 5) hotScore += 0.5;
    if (d3 >= 5) hotScore += 0.5;
    hotScore /= 1.5;
    
    var balance = Math.abs(hotScore - 0.5);
    
    var regress = 1 - balance;
    
    var maxMiss = Math.max(10 - d1, 10 - d2, 10 - d3);
    
    var trend = (d1 + d2 + d3) % 10;
    
    var recent = Math.random() * 0.5 + 0.5;
    
    var patternScore = Math.random() * 0.5 + 0.5;
    
    var sumRange = sum >= 10 && sum <= 20 ? 1 : 0;
    
    var avgMiss = (10 - avg) / 10;
    
    var missScore = avgMiss;
    
    var multiModel = Math.random() * 0.5 + 0.5;
    
    return [balance, regress, maxMiss, trend, recent, patternScore, sumRange, avgMiss, missScore, multiModel];
}