var reinforcementWeights = {
    hotWeight: 0.6,
    coldWeight: 0.4,
    trendWeight: 0.5,
    patternWeight: 0.5,
    diversityWeight: 0.3,
    positionWeight: 0.4
};

function identifyHotDigits(historyData, weights) {
    var digitCounts = {};
    for (var i = 0; i < historyData.length; i++) {
        var num = String(historyData[i].back3 || '').padStart(3, '0');
        for (var j = 0; j < num.length; j++) {
            var d = num[j];
            digitCounts[d] = (digitCounts[d] || 0) + 1;
        }
    }
    
    var digits = Object.keys(digitCounts).sort(function(a, b) {
        return digitCounts[b] - digitCounts[a];
    });
    
    return digits.slice(0, 5);
}

function identifyColdDigits(historyData, weights) {
    var digitCounts = {};
    for (var i = 0; i < historyData.length; i++) {
        var num = String(historyData[i].back3 || '').padStart(3, '0');
        for (var j = 0; j < num.length; j++) {
            var d = num[j];
            digitCounts[d] = (digitCounts[d] || 0) + 1;
        }
    }
    
    var digits = Object.keys(digitCounts).sort(function(a, b) {
        return digitCounts[a] - digitCounts[b];
    });
    
    return digits.slice(0, 3);
}

function generateSmartBets(count, historyData, weights) {
    var allNums = [];
    for (var i = 0; i < 1000; i++) {
        allNums.push(i.toString().padStart(3, '0'));
    }
    
    for (var i = allNums.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = allNums[i];
        allNums[i] = allNums[j];
        allNums[j] = temp;
    }
    
    return allNums.slice(0, count);
}

function evaluateBet(numStr, historyData, weights) {
    var score = 0;
    
    if (!historyData || historyData.length < 5) return Math.random();
    
    var digits = numStr.split('').map(Number);
    var hotDigits = identifyHotDigits(historyData, weights);
    var coldDigits = identifyColdDigits(historyData, weights);
    
    for (var i = 0; i < digits.length; i++) {
        var d = digits[i];
        if (hotDigits.indexOf(String(d)) !== -1) {
            score += (weights.hotWeight || 0.6) * 10;
        }
        if (coldDigits.indexOf(String(d)) !== -1) {
            score -= (weights.coldWeight || 0.4) * 5;
        }
    }
    
    var missing = calculateMissingValues(historyData);
    for (var i = 0; i < digits.length; i++) {
        var d = digits[i];
        var missVal = missing[d] || 0;
        if (missVal > 5) {
            score += missVal * 0.5;
        }
    }
    
    var recentBack3 = [];
    for (var i = Math.max(0, historyData.length - 10); i < historyData.length; i++) {
        recentBack3.push(parseInt(String(historyData[i].back3 || '0').padStart(3, '0')));
    }
    
    var numVal = parseInt(numStr);
    if (recentBack3.length > 0) {
        var avgRecent = recentBack3.reduce(function(a, b) { return a + b; }, 0) / recentBack3.length;
        var distance = Math.abs(numVal - avgRecent);
        score += Math.max(0, 100 - distance) * 0.1;
    }
    
    var sum = digits.reduce(function(a, b) { return a + b; }, 0);
    var sumScores = [];
    for (var i = Math.max(0, historyData.length - 20); i < historyData.length; i++) {
        var p = historyData[i];
        var pNum = p.number || p.num || '';
        if (pNum.length >= 5) {
            var pDigits = pNum.split('').map(Number);
            sumScores.push(pDigits.reduce(function(a, b) { return a + b; }, 0));
        }
    }
    if (sumScores.length > 0) {
        var avgSum = sumScores.reduce(function(a, b) { return a + b; }, 0) / sumScores.length;
        var stdSum = Math.sqrt(sumScores.reduce(function(acc, s) { return acc + Math.pow(s - avgSum, 2); }, 0) / sumScores.length);
        var zScore = Math.abs(sum - avgSum) / (stdSum || 1);
        if (zScore < 1.5) {
            score += 15;
        }
    }
    
    var oddCount = digits.filter(function(d) { return d % 2 === 1; }).length;
    var evenCount = 3 - oddCount;
    var oddEvenRatio = oddCount / 3;
    var targetRatio = 0.5;
    score += (1 - Math.abs(oddEvenRatio - targetRatio)) * 10;
    
    var bigCount = digits.filter(function(d) { return d >= 5; }).length;
    var smallCount = 3 - bigCount;
    var bigSmallRatio = bigCount / 3;
    score += (1 - Math.abs(bigSmallRatio - targetRatio)) * 10;
    
    var diversity = new Set(digits).size;
    score += diversity * 5;
    
    return score;
}

function normalizeFeature(value, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function calculateWeightedDistance(features1, features2) {
    if (!features1 || !features2 || features1.length === 0 || features2.length === 0) return 0;
    
    var minLength = Math.min(features1.length, features2.length);
    if (minLength === 0) return 0;
    
    var weights = [];
    for (var i = 0; i < minLength; i++) {
        if (i < 2) {
            weights.push(0.9);
        } else if (i < 12) {
            weights.push(0.6);
        } else if (i < 42) {
            weights.push(0.4);
        } else if (i < 50) {
            weights.push(0.3);
        } else if (i < 54) {
            weights.push(0.3);
        } else if (i < 58) {
            weights.push(0.8);
        } else if (i < 66) {
            weights.push(0.9);
        } else if (i < 85) {
            weights.push(0.6);
        } else {
            weights.push(0.3);
        }
    }
    
    var totalWeight = 0;
    var weightedDiff = 0;
    
    for (var i = 0; i < minLength; i++) {
        var w = weights[i] || 0.5;
        var diff = Math.abs(features1[i] - features2[i]);
        
        weightedDiff += diff * w;
        totalWeight += w;
    }
    
    var avgDiff = totalWeight > 0 ? weightedDiff / totalWeight : 1;
    
    return Math.max(0, 1 - avgDiff);
}

function calculateEMA(data, period) {
    var ema = [];
    var multiplier = 2 / (period + 1);
    
    for (var i = 0; i < data.length; i++) {
        if (i === 0) {
            ema.push(data[i]);
        } else {
            ema.push(data[i] * multiplier + ema[i - 1] * (1 - multiplier));
        }
    }
    
    return ema;
}

function calculateMACD(data, shortPeriod, longPeriod, signalPeriod) {
    shortPeriod = shortPeriod || 12;
    longPeriod = longPeriod || 26;
    signalPeriod = signalPeriod || 9;
    
    var shortEMA = calculateEMA(data, shortPeriod);
    var longEMA = calculateEMA(data, longPeriod);
    
    var macd = [];
    for (var i = 0; i < shortEMA.length && i < longEMA.length; i++) {
        macd.push(shortEMA[i] - longEMA[i]);
    }
    
    var signal = calculateEMA(macd, signalPeriod);
    
    var histogram = [];
    for (var i = 0; i < macd.length && i < signal.length; i++) {
        histogram.push(macd[i] - signal[i]);
    }
    
    return { macd: macd, signal: signal, histogram: histogram };
}

function calculateRSI(data, period) {
    if (data.length < period + 1) return null;
    
    var gains = [], losses = [];
    for (var i = 1; i < data.length; i++) {
        var diff = data[i] - data[i - 1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
    }
    
    var avgGain = [], avgLoss = [], rs = [], rsi = [];
    for (var i = 0; i < gains.length; i++) {
        if (i < period) {
            avgGain.push(gains.slice(0, i + 1).reduce(function(a, b) { return a + b; }, 0) / (i + 1));
            avgLoss.push(losses.slice(0, i + 1).reduce(function(a, b) { return a + b; }, 0) / (i + 1));
        } else {
            avgGain.push((avgGain[i - 1] * (period - 1) + gains[i]) / period);
            avgLoss.push((avgLoss[i - 1] * (period - 1) + losses[i]) / period);
        }
        rs.push(avgLoss[i] > 0 ? avgGain[i] / avgLoss[i] : 100);
        rsi.push(100 - (100 / (1 + rs[i])));
    }
    
    return rsi;
}

function calculateATR(data, period) {
    if (data.length < period + 1) return 0;
    
    var tr = [];
    for (var i = 1; i < data.length; i++) {
        var high = data[i];
        var low = data[i - 1];
        var prevClose = data[i - 1];
        var tr1 = Math.abs(high - low);
        var tr2 = Math.abs(high - prevClose);
        var tr3 = Math.abs(low - prevClose);
        tr.push(Math.max(tr1, tr2, tr3));
    }
    
    var atr = [];
    for (var i = 0; i < tr.length; i++) {
        if (i < period - 1) {
            var sum = 0;
            for (var j = 0; j <= i; j++) sum += tr[j];
            atr.push(sum / (i + 1));
        } else {
            atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
        }
    }
    
    return atr.length > 0 ? atr[atr.length - 1] : 0;
}

function calculateSlope(data, period) {
    if (data.length < period) return 0;
    
    var recent = data.slice(-period);
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (var i = 0; i < recent.length; i++) {
        sumX += i;
        sumY += recent[i];
        sumXY += i * recent[i];
        sumX2 += i * i;
    }
    
    var n = recent.length;
    var denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
}

function calculateVolatility(data) {
    if (data.length < 2) return 0;
    
    var mean = data.reduce(function(a, b) { return a + b; }, 0) / data.length;
    var variance = data.reduce(function(sum, val) {
        return sum + Math.pow(val - mean, 2);
    }, 0) / data.length;
    
    return Math.sqrt(variance);
}

function calculateConsecutiveCounts(data) {
    var maxRed = 0, maxGreen = 0, avgRed = 0, avgGreen = 0;
    var currentRed = 0, currentGreen = 0;
    var redStreaks = [], greenStreaks = [];
    
    for (var i = 1; i < data.length; i++) {
        if (data[i] > data[i - 1]) {
            currentRed++;
            currentGreen = 0;
            if (currentRed > maxRed) maxRed = currentRed;
        } else if (data[i] < data[i - 1]) {
            currentGreen++;
            currentRed = 0;
            if (currentGreen > maxGreen) maxGreen = currentGreen;
        } else {
            if (currentRed > 0) {
                redStreaks.push(currentRed);
                currentRed = 0;
            }
            if (currentGreen > 0) {
                greenStreaks.push(currentGreen);
                currentGreen = 0;
            }
        }
    }
    
    if (currentRed > 0) redStreaks.push(currentRed);
    if (currentGreen > 0) greenStreaks.push(currentGreen);
    
    avgRed = redStreaks.length > 0 ? redStreaks.reduce(function(a, b) { return a + b; }, 0) / redStreaks.length : 0;
    avgGreen = greenStreaks.length > 0 ? greenStreaks.reduce(function(a, b) { return a + b; }, 0) / greenStreaks.length : 0;
    
    return { maxRed: maxRed, maxGreen: maxGreen, avgRed: avgRed, avgGreen: avgGreen };
}

function calculateOscillationCount(data, threshold) {
    var count = 0;
    for (var i = 2; i < data.length; i++) {
        var prevDiff = data[i - 1] - data[i - 2];
        var currDiff = data[i] - data[i - 1];
        if (prevDiff * currDiff < 0 && Math.abs(currDiff) > threshold) {
            count++;
        }
    }
    return count;
}

function calculateBreakoutCount(data, threshold) {
    var count = 0;
    var maxVal = data[0];
    var minVal = data[0];
    
    for (var i = 1; i < data.length; i++) {
        if (data[i] > maxVal + threshold) {
            count++;
            maxVal = data[i];
        } else if (data[i] < minVal - threshold) {
            count++;
            minVal = data[i];
        }
        maxVal = Math.max(maxVal, data[i]);
        minVal = Math.min(minVal, data[i]);
    }
    
    return count;
}

function calculateMissingValues(historyData) {
    var digitCounts = {};
    for (var i = 0; i < 10; i++) digitCounts[i] = 0;
    
    for (var i = historyData.length - 1; i >= 0; i--) {
        var numStr = String(historyData[i].back3 || '').padStart(3, '0');
        for (var j = 0; j < numStr.length; j++) {
            var d = parseInt(numStr[j]);
            if (!isNaN(d)) digitCounts[d]++;
        }
    }
    
    var missing = [];
    for (var i = 0; i < 10; i++) {
        missing.push(digitCounts[i] === 0 ? historyData.length : historyData.length - digitCounts[i]);
    }
    
    return missing;
}

function extractBetPattern(bets, historyData, actual, hit) {
    if (!bets || bets.length === 0) return null;
    
    var features = [];
    
    var digitCounts = {};
    for (var d = 0; d < 10; d++) digitCounts[d] = 0;
    
    var positionCounts = [[], [], []];
    for (var p = 0; p < 3; p++) {
        positionCounts[p] = {};
        for (var d = 0; d < 10; d++) positionCounts[p][d] = 0;
    }
    
    var sumValues = [];
    var oddCounts = [];
    var bigCounts = [];
    var repeatCounts = [];
    var spanValues = [];
    var digitVariety = [];
    
    for (var i = 0; i < bets.length; i++) {
        var numStr = String(bets[i]).padStart(3, '0');
        var digits = numStr.split('').map(Number);
        
        for (var j = 0; j < digits.length; j++) {
            digitCounts[digits[j]]++;
            positionCounts[j][digits[j]]++;
        }
        
        sumValues.push(digits.reduce(function(a, b) { return a + b; }, 0));
        oddCounts.push(digits.filter(function(d) { return d % 2 === 1; }).length);
        bigCounts.push(digits.filter(function(d) { return d >= 5; }).length);
        
        var uniqueDigits = new Set(digits).size;
        digitVariety.push(uniqueDigits);
        
        spanValues.push(Math.max.apply(null, digits) - Math.min.apply(null, digits));
    }
    
    var digitFreq = Object.values(digitCounts);
    var maxFreq = Math.max.apply(Math, digitFreq);
    var minFreq = Math.min.apply(Math, digitFreq);
    
    var hotDigits = [];
    var coldDigits = [];
    for (var d = 0; d < 10; d++) {
        if (digitCounts[d] >= maxFreq * 0.8) hotDigits.push(d);
        if (digitCounts[d] <= minFreq * 1.2) coldDigits.push(d);
    }
    
    features.push(normalizeFeature(hotDigits.length, 0, 10));
    features.push(normalizeFeature(coldDigits.length, 0, 10));
    
    for (var d = 0; d < 10; d++) {
        features.push(normalizeFeature(digitCounts[d], 0, bets.length));
    }
    
    for (var p = 0; p < 3; p++) {
        for (var d = 0; d < 10; d++) {
            features.push(normalizeFeature(positionCounts[p][d], 0, bets.length));
        }
    }
    
    var sumMean = 0;
    var sumStd = 0;
    if (sumValues.length > 0) {
        sumMean = sumValues.reduce(function(a, b) { return a + b; }, 0) / sumValues.length;
        sumStd = Math.sqrt(sumValues.map(function(v) { return Math.pow(v - sumMean, 2); }).reduce(function(a, b) { return a + b; }, 0) / sumValues.length);
        features.push(normalizeFeature(sumMean, 0, 27));
        features.push(normalizeFeature(sumStd, 0, 10));
    } else {
        features.push(0.5);
        features.push(0.5);
    }
    
    var oddRatio = 0.5;
    if (oddCounts.length > 0) {
        oddRatio = oddCounts.reduce(function(a, b) { return a + b; }, 0) / (oddCounts.length * 3);
        features.push(normalizeFeature(oddRatio, 0, 1));
    } else {
        features.push(0.5);
    }
    
    var bigRatio = 0.5;
    if (bigCounts.length > 0) {
        bigRatio = bigCounts.reduce(function(a, b) { return a + b; }, 0) / (bigCounts.length * 3);
        features.push(normalizeFeature(bigRatio, 0, 1));
    } else {
        features.push(0.5);
    }
    
    if (digitVariety.length > 0) {
        var varietyMean = digitVariety.reduce(function(a, b) { return a + b; }, 0) / digitVariety.length;
        features.push(normalizeFeature(varietyMean, 1, 3));
    } else {
        features.push(0.5);
    }
    
    if (spanValues.length > 0) {
        var spanMean = spanValues.reduce(function(a, b) { return a + b; }, 0) / spanValues.length;
        var spanStd = Math.sqrt(spanValues.map(function(v) { return Math.pow(v - spanMean, 2); }).reduce(function(a, b) { return a + b; }, 0) / spanValues.length);
        features.push(normalizeFeature(spanMean, 0, 9));
        features.push(normalizeFeature(spanStd, 0, 5));
    } else {
        features.push(0.5);
        features.push(0.5);
    }
    
    var repeatDigitCounts = {};
    for (var i = 0; i < bets.length; i++) {
        var numStr = String(bets[i]).padStart(3, '0');
        var digits = numStr.split('').map(Number);
        var hasRepeat = new Set(digits).size < 3;
        if (hasRepeat) {
            var repeatType = new Set(digits).size;
            repeatDigitCounts[repeatType] = (repeatDigitCounts[repeatType] || 0) + 1;
        }
    }
    features.push(normalizeFeature(repeatDigitCounts[2] || 0, 0, bets.length));
    features.push(normalizeFeature(repeatDigitCounts[1] || 0, 0, bets.length));
    
    var sequentialCounts = {};
    for (var i = 0; i < bets.length; i++) {
        var numStr = String(bets[i]).padStart(3, '0');
        var digits = numStr.split('').map(Number).sort(function(a, b) { return a - b; });
        var isSequential = (digits[1] === digits[0] + 1) && (digits[2] === digits[1] + 1);
        if (isSequential) sequentialCounts.total = (sequentialCounts.total || 0) + 1;
    }
    features.push(normalizeFeature(sequentialCounts.total || 0, 0, bets.length));
    
    var boundaryNums = [];
    for (var i = 0; i < bets.length; i++) {
        var numVal = parseInt(String(bets[i]).padStart(3, '0'));
        if (numVal < 100) boundaryNums.push(numVal);
        if (numVal > 900) boundaryNums.push(numVal);
    }
    features.push(normalizeFeature(boundaryNums.length, 0, bets.length));
    
    var numValues = [];
    for (var i = 0; i < bets.length; i++) {
        numValues.push(parseInt(String(bets[i]).padStart(3, '0')));
    }
    if (numValues.length > 0) {
        var numMean = numValues.reduce(function(a, b) { return a + b; }, 0) / numValues.length;
        var numStd = Math.sqrt(numValues.map(function(v) { return Math.pow(v - numMean, 2); }).reduce(function(a, b) { return a + b; }, 0) / numValues.length);
        features.push(normalizeFeature(numMean, 0, 999));
        features.push(normalizeFeature(numStd, 0, 300));
        
        var numMedian = numValues.sort(function(a, b) { return a - b; })[Math.floor(numValues.length / 2)];
        features.push(normalizeFeature(numMedian, 0, 999));
        
        var numRange = Math.max.apply(null, numValues) - Math.min.apply(null, numValues);
        features.push(normalizeFeature(numRange, 0, 999));
        
        var numSum = numValues.reduce(function(a, b) { return a + b; }, 0);
        features.push(normalizeFeature(numSum, 0, bets.length * 999));
    } else {
        features.push(0.5);
        features.push(0.5);
        features.push(0.5);
        features.push(0.5);
        features.push(0.5);
    }
    
    var hitDigitCounts = {};
    if (actual) {
        var actualDigits = String(actual).padStart(3, '0').split('').map(Number);
        for (var j = 0; j < actualDigits.length; j++) {
            hitDigitCounts[actualDigits[j]] = digitCounts[actualDigits[j]] || 0;
        }
    }
    
    features.push(normalizeFeature(bets.length, 0, 1000));
    
    if (historyData && historyData.length > 0) {
        var recent = historyData.slice(-20);
        var back3Values = [];
        for (var i = 0; i < recent.length; i++) {
            back3Values.push(parseInt(String(recent[i].back3 || '0').padStart(3, '0')));
        }
        
        var consecutive = calculateConsecutiveCounts(back3Values);
        features.push(normalizeFeature(consecutive.maxRed, 0, 20));
        features.push(normalizeFeature(consecutive.maxGreen, 0, 20));
        features.push(normalizeFeature(consecutive.avgRed, 0, 10));
        features.push(normalizeFeature(consecutive.avgGreen, 0, 10));
        
        var oscillation = calculateOscillationCount(back3Values, 5);
        features.push(normalizeFeature(oscillation, 0, recent.length));
        
        if (back3Values.length > 0) {
            features.push(normalizeFeature(Math.max.apply(Math, back3Values), 0, 999));
            features.push(normalizeFeature(Math.min.apply(Math, back3Values), 0, 999));
        } else {
            features.push(0.5);
            features.push(0.5);
        }
        
        var breakout = calculateBreakoutCount(back3Values, 10);
        features.push(normalizeFeature(breakout, 0, recent.length));
        
        var slope = calculateSlope(back3Values, 10);
        features.push(normalizeFeature(slope, -50, 50));
        
        var volatility = calculateVolatility(back3Values);
        features.push(normalizeFeature(volatility, 0, 500));
        
        var atr = calculateATR(back3Values, 14);
        features.push(normalizeFeature(atr, 0, 100));
        
        var rsiArray = calculateRSI(back3Values, 14);
        var rsi = rsiArray && rsiArray.length > 0 ? rsiArray[rsiArray.length - 1] : 50;
        features.push(normalizeFeature(rsi, 0, 100));
        
        var macdResult = calculateMACD(back3Values, 12, 26, 9);
        var macd = macdResult && macdResult.macd && macdResult.macd.length > 0 ? macdResult.macd[macdResult.macd.length - 1] : 0;
        features.push(normalizeFeature(macd, -50, 50));
        
        var macdSignal = macdResult && macdResult.signal && macdResult.signal.length > 0 ? macdResult.signal[macdResult.signal.length - 1] : 0;
        features.push(normalizeFeature(macdSignal, -50, 50));
        
        var ema12 = calculateEMA(back3Values, 12);
        features.push(normalizeFeature(ema12.length > 0 ? ema12[ema12.length - 1] : 0, 0, 999));
        
        var ema26 = calculateEMA(back3Values, 26);
        features.push(normalizeFeature(ema26.length > 0 ? ema26[ema26.length - 1] : 0, 0, 999));
        
        var missingValues = calculateMissingValues(historyData);
        var avgMissing = missingValues.reduce(function(a, b) { return a + b; }, 0) / 10;
        features.push(normalizeFeature(avgMissing, 0, 50));
        
        for (var m = 0; m < 10; m++) {
            features.push(normalizeFeature(missingValues[m] || 0, 0, 50));
        }
        
        var zoneCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < bets.length; i++) {
            var numVal = parseInt(String(bets[i]).padStart(3, '0'));
            var zone = Math.floor(numVal / 100);
            if (zone >= 0 && zone < 10) zoneCounts[zone]++;
        }
        for (var z = 0; z < 10; z++) {
            features.push(normalizeFeature(zoneCounts[z], 0, bets.length));
        }
        
        var zoneEntropy = 0;
        for (var z = 0; z < 10; z++) {
            var p = zoneCounts[z] / bets.length;
            if (p > 0) zoneEntropy -= p * Math.log(p);
        }
        features.push(normalizeFeature(zoneEntropy, 0, Math.log(10)));
        
        var digitEntropy = 0;
        for (var d = 0; d < 10; d++) {
            var p = digitCounts[d] / (bets.length * 3);
            if (p > 0) digitEntropy -= p * Math.log(p);
        }
        features.push(normalizeFeature(digitEntropy, 0, Math.log(10)));
        
        var positionEntropies = [];
        for (var p = 0; p < 3; p++) {
            var posEntropy = 0;
            var total = 0;
            for (var d = 0; d < 10; d++) total += positionCounts[p][d];
            for (var d = 0; d < 10; d++) {
                var prob = total > 0 ? positionCounts[p][d] / total : 0;
                if (prob > 0) posEntropy -= prob * Math.log(prob);
            }
            positionEntropies.push(posEntropy);
            features.push(normalizeFeature(posEntropy, 0, Math.log(10)));
        }
        
        var comboCounts = {};
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var combo1 = numStr[0] + numStr[1];
            var combo2 = numStr[1] + numStr[2];
            var combo3 = numStr[0] + numStr[2];
            comboCounts[combo1] = (comboCounts[combo1] || 0) + 1;
            comboCounts[combo2] = (comboCounts[combo2] || 0) + 1;
            comboCounts[combo3] = (comboCounts[combo3] || 0) + 1;
        }
        var topComboCount = 0;
        for (var key in comboCounts) {
            if (comboCounts[key] > topComboCount) topComboCount = comboCounts[key];
        }
        features.push(normalizeFeature(topComboCount, 0, bets.length));
        features.push(normalizeFeature(Object.keys(comboCounts).length, 0, 300));
        
        var shapeCounts = {
            'asc': 0, 'desc': 0, 'peak': 0, 'valley': 0, 'flat': 0, 'mixed': 0
        };
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var d1 = parseInt(numStr[0]), d2 = parseInt(numStr[1]), d3 = parseInt(numStr[2]);
            if (d1 < d2 && d2 < d3) shapeCounts['asc']++;
            else if (d1 > d2 && d2 > d3) shapeCounts['desc']++;
            else if (d1 < d2 && d2 > d3) shapeCounts['peak']++;
            else if (d1 > d2 && d2 < d3) shapeCounts['valley']++;
            else if (d1 === d2 && d2 === d3) shapeCounts['flat']++;
            else shapeCounts['mixed']++;
        }
        for (var shape in shapeCounts) {
            features.push(normalizeFeature(shapeCounts[shape], 0, bets.length));
        }
        
        var symmetryCounts = {
            'palindrome': 0, 'mirror': 0, 'reverse': 0
        };
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            if (numStr[0] === numStr[2]) symmetryCounts['palindrome']++;
            if (numStr[0] === (9 - parseInt(numStr[2])).toString()) symmetryCounts['mirror']++;
            if (numStr === numStr.split('').reverse().join('')) symmetryCounts['reverse']++;
        }
        for (var sym in symmetryCounts) {
            features.push(normalizeFeature(symmetryCounts[sym], 0, bets.length));
        }
        
        var tripletCounts = {};
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var sorted = numStr.split('').sort().join('');
            tripletCounts[sorted] = (tripletCounts[sorted] || 0) + 1;
        }
        features.push(normalizeFeature(Object.keys(tripletCounts).length, 0, bets.length));
        
        var digitCorrelation = 0;
        for (var d = 0; d < 10; d++) {
            for (var e = d + 1; e < 10; e++) {
                var countD = digitCounts[d];
                var countE = digitCounts[e];
                var coOccur = 0;
                for (var i = 0; i < bets.length; i++) {
                    var numStr = String(bets[i]).padStart(3, '0');
                    if (numStr.indexOf(d.toString()) !== -1 && numStr.indexOf(e.toString()) !== -1) {
                        coOccur++;
                    }
                }
                var expected = (countD / (bets.length * 3)) * (countE / (bets.length * 3)) * bets.length;
                if (expected > 0) {
                    digitCorrelation += Math.abs(coOccur - expected);
                }
            }
        }
        features.push(normalizeFeature(digitCorrelation, 0, bets.length * 45));
        
        var coOccurrenceMatrix = [];
        for (var d1 = 0; d1 < 10; d1++) {
            for (var d2 = d1 + 1; d2 < 10; d2++) {
                var count = 0;
                for (var i = 0; i < bets.length; i++) {
                    var numStr = String(bets[i]).padStart(3, '0');
                    if (numStr.indexOf(d1.toString()) !== -1 && numStr.indexOf(d2.toString()) !== -1) {
                        count++;
                    }
                }
                coOccurrenceMatrix.push(count);
            }
        }
        var maxCoOccur = Math.max.apply(Math, coOccurrenceMatrix);
        for (var c = 0; c < coOccurrenceMatrix.length; c++) {
            features.push(normalizeFeature(coOccurrenceMatrix[c], 0, maxCoOccur || 1));
        }
        
        var posComboCounts = { 'h': {}, 't': {}, 'u': {} };
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var ht = numStr[0] + numStr[1];
            var tu = numStr[1] + numStr[2];
            posComboCounts['h'][ht] = (posComboCounts['h'][ht] || 0) + 1;
            posComboCounts['t'][tu] = (posComboCounts['t'][tu] || 0) + 1;
        }
        var htCounts = Object.values(posComboCounts['h']).sort(function(a, b) { return b - a; });
        var tuCounts = Object.values(posComboCounts['t']).sort(function(a, b) { return b - a; });
        for (var c = 0; c < 10; c++) {
            features.push(normalizeFeature(htCounts[c] || 0, 0, bets.length));
            features.push(normalizeFeature(tuCounts[c] || 0, 0, bets.length));
        }
        
        var modCounts = [];
        for (var m = 3; m <= 9; m++) {
            var counts = {};
            for (var r = 0; r < m; r++) counts[r] = 0;
            for (var i = 0; i < bets.length; i++) {
                var numVal = parseInt(String(bets[i]).padStart(3, '0'));
                counts[numVal % m]++;
            }
            var maxMod = Math.max.apply(Math, Object.values(counts));
            for (var r = 0; r < m; r++) {
                features.push(normalizeFeature(counts[r], 0, maxMod || 1));
            }
        }
        
        var rarePatterns = {
            'allSame': 0, 'allDiff': 0, 'twoSame': 0,
            'consecutive': 0, 'mirror': 0, 'palindrome': 0,
            'ascending': 0, 'descending': 0,
            'zeroIncluded': 0, 'nineIncluded': 0,
            'allBig': 0, 'allSmall': 0,
            'allOdd': 0, 'allEven': 0
        };
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var d1 = parseInt(numStr[0]), d2 = parseInt(numStr[1]), d3 = parseInt(numStr[2]);
            var unique = new Set([d1, d2, d3]).size;
            
            if (unique === 1) rarePatterns['allSame']++;
            if (unique === 3) rarePatterns['allDiff']++;
            if (unique === 2) rarePatterns['twoSame']++;
            if ((d2 === d1 + 1 && d3 === d2 + 1) || (d2 === d1 - 1 && d3 === d2 - 1)) rarePatterns['consecutive']++;
            if (d1 === 9 - d3) rarePatterns['mirror']++;
            if (d1 === d3) rarePatterns['palindrome']++;
            if (d1 < d2 && d2 < d3) rarePatterns['ascending']++;
            if (d1 > d2 && d2 > d3) rarePatterns['descending']++;
            if (d1 === 0 || d2 === 0 || d3 === 0) rarePatterns['zeroIncluded']++;
            if (d1 === 9 || d2 === 9 || d3 === 9) rarePatterns['nineIncluded']++;
            if (d1 >= 5 && d2 >= 5 && d3 >= 5) rarePatterns['allBig']++;
            if (d1 < 5 && d2 < 5 && d3 < 5) rarePatterns['allSmall']++;
            if (d1 % 2 === 1 && d2 % 2 === 1 && d3 % 2 === 1) rarePatterns['allOdd']++;
            if (d1 % 2 === 0 && d2 % 2 === 0 && d3 % 2 === 0) rarePatterns['allEven']++;
        }
        for (var key in rarePatterns) {
            features.push(normalizeFeature(rarePatterns[key], 0, bets.length));
        }
        
        var sortedNums = [];
        for (var i = 0; i < bets.length; i++) {
            sortedNums.push(parseInt(String(bets[i]).padStart(3, '0')));
        }
        sortedNums.sort(function(a, b) { return a - b; });
        
        var gaps = [];
        for (var i = 1; i < sortedNums.length; i++) {
            gaps.push(sortedNums[i] - sortedNums[i - 1]);
        }
        if (gaps.length > 0) {
            var gapMean = gaps.reduce(function(a, b) { return a + b; }, 0) / gaps.length;
            var gapStd = Math.sqrt(gaps.map(function(v) { return Math.pow(v - gapMean, 2); }).reduce(function(a, b) { return a + b; }, 0) / gaps.length);
            var gapMax = Math.max.apply(Math, gaps);
            var gapMin = Math.min.apply(Math, gaps);
            features.push(normalizeFeature(gapMean, 0, 100));
            features.push(normalizeFeature(gapStd, 0, 50));
            features.push(normalizeFeature(gapMax, 0, 999));
            features.push(normalizeFeature(gapMin, 0, 100));
        } else {
            features.push(0.5); features.push(0.5); features.push(0.5); features.push(0.5);
        }
        
        var clusterCounts = [0, 0, 0, 0, 0];
        for (var i = 0; i < sortedNums.length; i++) {
            var zone = Math.floor(sortedNums[i] / 200);
            if (zone >= 0 && zone < 5) clusterCounts[zone]++;
        }
        for (var z = 0; z < 5; z++) {
            features.push(normalizeFeature(clusterCounts[z], 0, bets.length));
        }
        
        var smallZoneCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < sortedNums.length; i++) {
            var zone = Math.floor(sortedNums[i] / 100);
            if (zone >= 0 && zone < 10) smallZoneCounts[zone]++;
        }
        for (var z = 0; z < 10; z++) {
            features.push(normalizeFeature(smallZoneCounts[z], 0, bets.length));
        }
        
        var densityFeatures = [];
        for (var z = 0; z < 10; z++) {
            var start = z * 100;
            var end = (z + 1) * 100;
            var zoneNums = sortedNums.filter(function(n) { return n >= start && n < end; });
            if (zoneNums.length > 1) {
                var zoneDensity = zoneNums.length / (end - start);
                var avgGap = 0;
                for (var i = 1; i < zoneNums.length; i++) {
                    avgGap += zoneNums[i] - zoneNums[i - 1];
                }
                avgGap /= (zoneNums.length - 1);
                densityFeatures.push(zoneDensity);
                densityFeatures.push(avgGap);
            } else {
                densityFeatures.push(0);
                densityFeatures.push(100);
            }
        }
        for (var d = 0; d < densityFeatures.length; d++) {
            features.push(normalizeFeature(densityFeatures[d], 0, 1));
        }
        
        var digitRank = [];
        for (var d = 0; d < 10; d++) {
            digitRank.push({ digit: d, count: digitCounts[d] });
        }
        digitRank.sort(function(a, b) { return b.count - a.count; });
        for (var r = 0; r < 10; r++) {
            features.push(normalizeFeature(digitRank[r].digit, 0, 9));
            features.push(normalizeFeature(digitRank[r].count, 0, bets.length * 3));
        }
        
        var pairCorrelations = [];
        for (var d1 = 0; d1 < 10; d1++) {
            for (var d2 = 0; d2 < 10; d2++) {
                if (d1 >= d2) continue;
                var coOccur = 0;
                var d1Count = 0;
                var d2Count = 0;
                for (var i = 0; i < bets.length; i++) {
                    var numStr = String(bets[i]).padStart(3, '0');
                    var hasD1 = numStr.indexOf(d1.toString()) !== -1;
                    var hasD2 = numStr.indexOf(d2.toString()) !== -1;
                    if (hasD1) d1Count++;
                    if (hasD2) d2Count++;
                    if (hasD1 && hasD2) coOccur++;
                }
                var expected = (d1Count * d2Count) / bets.length;
                var correlation = expected > 0 ? coOccur / expected : 0;
                pairCorrelations.push(correlation);
            }
        }
        var maxCorr = Math.max.apply(Math, pairCorrelations) || 1;
        var minCorr = Math.min.apply(Math, pairCorrelations) || 0;
        for (var c = 0; c < pairCorrelations.length; c++) {
            features.push(normalizeFeature(pairCorrelations[c], minCorr, maxCorr));
        }
        
        var posTransitionCounts = {};
        for (var i = 0; i < bets.length; i++) {
            var numStr = String(bets[i]).padStart(3, '0');
            var trans1 = numStr[0] + '->' + numStr[1];
            var trans2 = numStr[1] + '->' + numStr[2];
            posTransitionCounts[trans1] = (posTransitionCounts[trans1] || 0) + 1;
            posTransitionCounts[trans2] = (posTransitionCounts[trans2] || 0) + 1;
        }
        var topTransitions = Object.keys(posTransitionCounts).sort(function(a, b) {
            return posTransitionCounts[b] - posTransitionCounts[a];
        }).slice(0, 15);
        for (var t = 0; t < 15; t++) {
            features.push(normalizeFeature(posTransitionCounts[topTransitions[t]] || 0, 0, bets.length));
        }
        
        var distributionSkewness = 0;
        var distributionKurtosis = 0;
        if (sortedNums.length > 0) {
            var mean = sortedNums.reduce(function(a, b) { return a + b; }, 0) / sortedNums.length;
            var variance = sortedNums.map(function(v) { return Math.pow(v - mean, 2); }).reduce(function(a, b) { return a + b; }, 0) / sortedNums.length;
            var std = Math.sqrt(variance);
            if (std > 0) {
                distributionSkewness = sortedNums.map(function(v) { return Math.pow((v - mean) / std, 3); }).reduce(function(a, b) { return a + b; }, 0) / sortedNums.length;
                distributionKurtosis = sortedNums.map(function(v) { return Math.pow((v - mean) / std, 4); }).reduce(function(a, b) { return a + b; }, 0) / sortedNums.length - 3;
            }
        }
        features.push(normalizeFeature(distributionSkewness, -5, 5));
        features.push(normalizeFeature(distributionKurtosis, -5, 5));
        
        var boundaryFeatures = [0, 0, 0, 0];
        for (var i = 0; i < bets.length; i++) {
            var numVal = parseInt(String(bets[i]).padStart(3, '0'));
            if (numVal < 50) boundaryFeatures[0]++;
            if (numVal >= 950) boundaryFeatures[1]++;
            if (numVal >= 100 && numVal < 150) boundaryFeatures[2]++;
            if (numVal >= 850 && numVal < 900) boundaryFeatures[3]++;
        }
        for (var b = 0; b < boundaryFeatures.length; b++) {
            features.push(normalizeFeature(boundaryFeatures[b], 0, bets.length));
        }
        
        var hitInBets = false;
        if (actual) {
            hitInBets = bets.indexOf(actual) !== -1;
        }
    }
    
    return {
        version: 8,
        features: features,
        hit: hit,
        betCount: bets.length,
        hotDigits: hotDigits,
        coldDigits: coldDigits,
        sumMean: sumMean,
        sumStd: sumStd,
        oddRatio: oddRatio,
        bigRatio: bigRatio,
        hitDigitCounts: hitDigitCounts,
        prediction: actual
    };
}

function extractPattern(historyData, prediction, hit) {
    if (!historyData || historyData.length < 10) return null;
    
    var recent = historyData.slice(-20);
    var featureVector = [];
    
    var back3Values = [];
    var mid3Values = [];
    var front3Values = [];
    var sumValues = [];
    
    for (var i = 0; i < recent.length; i++) {
        var p = recent[i];
        back3Values.push(parseInt(p.back3 || '0'));
        mid3Values.push(parseInt(p.mid3 || '0'));
        front3Values.push(parseInt(p.front3 || '0'));
        
        var numStr = p.number || p.num || '';
        if (numStr.length >= 5) {
            var digits = numStr.split('').map(Number);
            sumValues.push(digits.reduce(function(a, b) { return a + b; }, 0));
        }
    }
    
    var length = recent.length;
    featureVector.push(normalizeFeature(length, 0, 100));
    
    var consecutive = calculateConsecutiveCounts(back3Values);
    featureVector.push(normalizeFeature(consecutive.maxRed, 0, 20));
    featureVector.push(normalizeFeature(consecutive.maxGreen, 0, 20));
    featureVector.push(normalizeFeature(consecutive.avgRed, 0, 10));
    featureVector.push(normalizeFeature(consecutive.avgGreen, 0, 10));
    
    var oscillation = calculateOscillationCount(back3Values, 5);
    featureVector.push(normalizeFeature(oscillation, 0, recent.length));
    
    var maxVal = Math.max.apply(Math, back3Values);
    var minVal = Math.min.apply(Math, back3Values);
    featureVector.push(normalizeFeature(maxVal, 0, 999));
    featureVector.push(normalizeFeature(minVal, 0, 999));
    
    var breakout = calculateBreakoutCount(back3Values, 10);
    featureVector.push(normalizeFeature(breakout, 0, recent.length));
    
    var slope = calculateSlope(back3Values, 10);
    featureVector.push(normalizeFeature(slope, -50, 50));
    
    var period = recent.length;
    featureVector.push(normalizeFeature(period, 0, 100));
    
    var volatility = calculateVolatility(back3Values);
    featureVector.push(normalizeFeature(volatility, 0, 500));
    
    var atr = calculateATR(back3Values, 14);
    featureVector.push(normalizeFeature(atr, 0, 100));
    
    var rsiArray = calculateRSI(back3Values, 14);
    var rsi = rsiArray && rsiArray.length > 0 ? rsiArray[rsiArray.length - 1] : 50;
    featureVector.push(normalizeFeature(rsi, 0, 100));
    
    var macdResult = calculateMACD(back3Values, 12, 26, 9);
    var macd = macdResult && macdResult.macd && macdResult.macd.length > 0 ? macdResult.macd[macdResult.macd.length - 1] : 0;
    featureVector.push(normalizeFeature(macd, -50, 50));
    
    var ema12 = calculateEMA(back3Values, 12);
    var emaValue = ema12.length > 0 ? ema12[ema12.length - 1] : 0;
    featureVector.push(normalizeFeature(emaValue, 0, 999));
    
    var ema26 = calculateEMA(back3Values, 26);
    var ema26Value = ema26.length > 0 ? ema26[ema26.length - 1] : 0;
    featureVector.push(normalizeFeature(ema26Value, 0, 999));
    
    var macdSignal = macdResult && macdResult.signal && macdResult.signal.length > 0 ? macdResult.signal[macdResult.signal.length - 1] : 0;
    featureVector.push(normalizeFeature(macdSignal, -50, 50));
    
    for (var i = 1; i < recent.length; i++) {
        var curr = recent[i];
        var prev = recent[i-1];
        
        var currBack3 = parseInt(curr.back3 || '0');
        var prevBack3 = parseInt(prev.back3 || '0');
        var currMid3 = parseInt(curr.mid3 || '0');
        var prevMid3 = parseInt(prev.mid3 || '0');
        var currFront3 = parseInt(curr.front3 || '0');
        var prevFront3 = parseInt(prev.front3 || '0');
        
        featureVector.push(normalizeFeature(currBack3 - prevBack3, -999, 999));
        featureVector.push(normalizeFeature(currMid3 - prevMid3, -999, 999));
        featureVector.push(normalizeFeature(currFront3 - prevFront3, -999, 999));
    }
    
    if (sumValues.length > 0) {
        var sumMean = sumValues.reduce(function(a, b) { return a + b; }, 0) / sumValues.length;
        var sumStd = Math.sqrt(sumValues.map(function(v) { return Math.pow(v - sumMean, 2); }).reduce(function(a, b) { return a + b; }, 0) / sumValues.length);
        featureVector.push(normalizeFeature(sumMean, 0, 50));
        featureVector.push(normalizeFeature(sumStd, 0, 20));
        
        var spanValues = [];
        for (var i = 0; i < recent.length; i++) {
            var numStr = recent[i].number || recent[i].num || '';
            if (numStr.length >= 5) {
                var digits = numStr.split('').map(Number);
                spanValues.push(Math.max.apply(null, digits) - Math.min.apply(null, digits));
            }
        }
        
        if (spanValues.length > 0) {
            var spanMean = spanValues.reduce(function(a, b) { return a + b; }, 0) / spanValues.length;
            featureVector.push(normalizeFeature(spanMean, 0, 10));
        } else {
            featureVector.push(0.5);
        }
        
        var oddRatios = [];
        var bigRatios = [];
        for (var i = 0; i < recent.length; i++) {
            var numStr = recent[i].number || recent[i].num || '';
            if (numStr.length >= 5) {
                var digits = numStr.split('').map(Number);
                oddRatios.push(digits.filter(function(d) { return d % 2 === 1; }).length / 5);
                bigRatios.push(digits.filter(function(d) { return d >= 5; }).length / 5);
            }
        }
        
        if (oddRatios.length > 0) {
            var oddMean = oddRatios.reduce(function(a, b) { return a + b; }, 0) / oddRatios.length;
            var bigMean = bigRatios.reduce(function(a, b) { return a + b; }, 0) / bigRatios.length;
            featureVector.push(oddMean);
            featureVector.push(bigMean);
        } else {
            featureVector.push(0.5);
            featureVector.push(0.5);
        }
    } else {
        featureVector.push(0.5);
        featureVector.push(0.5);
        featureVector.push(0.5);
        featureVector.push(0.5);
        featureVector.push(0.5);
    }
    
    var sumZones = [0, 0, 0, 0, 0];
    for (var i = 0; i < sumValues.length; i++) {
        var s = sumValues[i];
        if (s <= 10) sumZones[0]++;
        else if (s <= 15) sumZones[1]++;
        else if (s <= 20) sumZones[2]++;
        else if (s <= 25) sumZones[3]++;
        else sumZones[4]++;
    }
    var totalSums = sumValues.length || 1;
    for (var j = 0; j < 5; j++) {
        featureVector.push((sumZones[j] / totalSums));
    }
    
    var missingAnalysis = calculateMissingValues(historyData);
    for (var j = 0; j < 10; j++) {
        featureVector.push(normalizeFeature(missingAnalysis[j] || 0, 0, 50));
    }
    
    if (mid3Values.length >= 5) {
        var ema5Mid = calculateEMA(mid3Values, 5);
        var ema10Mid = calculateEMA(mid3Values, 10);
        var slopeMid = calculateSlope(mid3Values, 10);
        featureVector.push(normalizeFeature(ema5Mid[ema5Mid.length - 1] || 0, 0, 999));
        featureVector.push(normalizeFeature(ema10Mid[ema10Mid.length - 1] || 0, 0, 999));
        featureVector.push(normalizeFeature(slopeMid, -50, 50));
    } else {
        featureVector.push(0.5);
        featureVector.push(0.5);
        featureVector.push(0.5);
    }
    
    if (front3Values.length >= 5) {
        var ema5Front = calculateEMA(front3Values, 5);
        var ema10Front = calculateEMA(front3Values, 10);
        var slopeFront = calculateSlope(front3Values, 10);
        featureVector.push(normalizeFeature(ema5Front[ema5Front.length - 1] || 0, 0, 999));
        featureVector.push(normalizeFeature(ema10Front[ema10Front.length - 1] || 0, 0, 999));
        featureVector.push(normalizeFeature(slopeFront, -50, 50));
    } else {
        featureVector.push(0.5);
        featureVector.push(0.5);
        featureVector.push(0.5);
    }
    
    var periodInfo = historyData[historyData.length - 1];
    var periodStr = periodInfo.period || '';
    var month = 1;
    var weekday = 1;
    
    if (periodStr.length >= 6) {
        var year = parseInt(periodStr.substring(0, 4));
        var mon = parseInt(periodStr.substring(4, 6));
        if (!isNaN(year) && !isNaN(mon)) {
            var date = new Date(year, mon - 1, 1);
            weekday = date.getDay();
            month = mon;
        }
    }
    
    featureVector.push(normalizeFeature(weekday, 0, 7));
    featureVector.push(normalizeFeature(month, 1, 12));
    
    return {
        features: featureVector,
        prediction: prediction,
        hit: hit,
        timestamp: Date.now()
    };
}

function calculatePatternPriority(pattern, weights) {
    var priority = 1;
    
    if (pattern.hit) {
        priority *= (weights.hitMultiplier || 1.5);
    }
    
    if (pattern.features && pattern.features.length > 0) {
        var avgFeature = pattern.features.reduce(function(a, b) { return a + Math.abs(b); }, 0) / pattern.features.length;
        if (avgFeature < 50) {
            priority *= (weights.stableMultiplier || 1.2);
        }
    }
    
    var now = Date.now();
    if (pattern.timestamp && (now - pattern.timestamp) < 3600000) {
        priority *= (weights.recentMultiplier || 1.1);
    }
    
    return priority;
}

function updateReinforcementWeights(weights, historyData, bet, hit) {
    if (hit) {
        weights.hotWeight = Math.min(1, weights.hotWeight + 0.05);
        weights.trendWeight = Math.min(1, weights.trendWeight + 0.03);
    } else {
        weights.hotWeight = Math.max(0.1, weights.hotWeight - 0.02);
        weights.coldWeight = Math.min(1, weights.coldWeight + 0.03);
    }
}

function performCrossValidation(periods, patterns) {
    if (!periods || periods.length < 20 || !patterns || patterns.length === 0) {
        return { accuracy: 0, folds: 0 };
    }
    
    var foldSize = Math.floor(periods.length / 5);
    var totalAccuracy = 0;
    var validFolds = 0;
    
    for (var fold = 0; fold < 5; fold++) {
        var testStart = fold * foldSize;
        var testEnd = (fold + 1) * foldSize;
        var testSet = periods.slice(testStart, testEnd);
        var trainSet = periods.slice(0, testStart).concat(periods.slice(testEnd));
        
        if (trainSet.length < 10) continue;
        
        var hits = 0;
        var total = 0;
        
        for (var i = 0; i < testSet.length; i++) {
            var testPeriod = testSet[i];
            var randomIndex = Math.floor(Math.random() * (trainSet.length - 10));
            var history = trainSet.slice(Math.max(0, randomIndex - 10), randomIndex);
            
            var bets = generateSmartBets(100, history, reinforcementWeights);
            
            for (var j = 0; j < bets.length; j++) {
                if (bets[j] === testPeriod.back3) {
                    hits++;
                    break;
                }
            }
            total++;
        }
        
        totalAccuracy += hits / total;
        validFolds++;
    }
    
    return {
        accuracy: validFolds > 0 ? (totalAccuracy / validFolds) * 100 : 0,
        folds: validFolds
    };
}

self.onmessage = function(e) {
    var data = e.data;
    
    if (data.type === 'train') {
        var periods = data.periods;
        var simulationCount = data.simulationCount || 2000;
        
        console.log('[AI Worker] Training started, periods:', periods ? periods.length : 0);
        if (periods && periods.length > 0) {
            console.log('[AI Worker] First period:', periods[0].period, 'back3:', periods[0].back3);
            console.log('[AI Worker] Last period:', periods[periods.length - 1].period, 'back3:', periods[periods.length - 1].back3);
        }
        
        if (!periods || periods.length < 20) {
            self.postMessage({ type: 'complete', totalSimulations: 0, totalHits: 0, hitRate: 0, patterns: [] });
            return;
        }
        
        var totalHits = 0;
        var totalBets = 0;
        var patternMatches = [];
        var count = Math.min(simulationCount, periods.length - 50);
        
        var batchSize = 20;
        var current = 0;
        
        function processBatch() {
            var end = Math.min(current + batchSize, count);
            
            for (var i = current; i < end; i++) {
                var randomIndex = Math.floor(Math.random() * (periods.length - 51));
                var historyEndIndex = randomIndex;
                var testPeriod = periods[historyEndIndex];
                var nextPeriod = periods[historyEndIndex + 1];
                var historyData = periods.slice(Math.max(0, historyEndIndex - 50), historyEndIndex);
                
                var bets = generateSmartBets(655, historyData, reinforcementWeights);
                var actualRaw = nextPeriod.back3;
                var actual = String(actualRaw).padStart(3, '0');
                totalBets += bets.length;
                
                var hit = false;
                for (var j = 0; j < bets.length; j++) {
                    if (bets[j] === actual) {
                        hit = true;
                        break;
                    }
                }
                
                var groupFeatures = extractBetPattern(bets, historyData, actual, hit);
                var matchedPattern = null;
                var matchedIndex = -1;
                
                for (var k = 0; k < patternMatches.length; k++) {
                var p = patternMatches[k];
                if (p.version === 5 && calculateWeightedDistance(groupFeatures.features, p.features) > 0.95) {
                    matchedPattern = p;
                    matchedIndex = k;
                    break;
                }
            }
                
                if (hit) {
                    totalHits++;
                    console.log('[AI Worker] Hit! bets include:', actual, 'from', testPeriod.issue, 'predicting', nextPeriod.issue);
                    
                    if (matchedPattern) {
                        matchedPattern.hitCount = (matchedPattern.hitCount || 0) + 1;
                        matchedPattern.missStreak = 0;
                        matchedPattern.lastHit = Date.now();
                        matchedPattern.priority = calculatePatternPriority(matchedPattern, reinforcementWeights);
                        console.log('[AI Worker] Pattern updated - hitCount:', matchedPattern.hitCount);
                    } else {
                        groupFeatures.version = 8;
                        groupFeatures.patternType = 'positive';
                        groupFeatures.hitCount = 1;
                        groupFeatures.missStreak = 0;
                        groupFeatures.totalMatch = 1;
                        groupFeatures.lastHit = Date.now();
                        groupFeatures.priority = calculatePatternPriority(groupFeatures, reinforcementWeights);
                        patternMatches.push(groupFeatures);
                        console.log('[AI Worker] New pattern added - features:', groupFeatures.features.length);
                    }
                } else {
                    if (matchedPattern) {
                        matchedPattern.missStreak = (matchedPattern.missStreak || 0) + 1;
                        matchedPattern.totalMatch = (matchedPattern.totalMatch || 0) + 1;
                        console.log('[AI Worker] Pattern miss streak:', matchedPattern.missStreak);
                        
                        if (matchedPattern.missStreak >= 5) {
                            patternMatches.splice(matchedIndex, 1);
                            console.log('[AI Worker] Pattern removed - 5 consecutive misses');
                        }
                    }
                    
                    if (!hit && i % 50 === 0) {
                        console.log('[AI Worker] Miss:', testPeriod.issue, '->', nextPeriod.issue, 'actual:', actual, '(raw:', actualRaw, ')');
                    }
                }
            }
            
            current = end;
            
            var progress = (current / count) * 100;
            self.postMessage({ type: 'progress', progress: progress, total: current, currentHits: totalHits });
            
            if (current < count) {
                setTimeout(processBatch, 0);
            } else {
                var periodHitRate = count > 0 ? (totalHits / count) * 100 : 0;
                var betHitRate = totalBets > 0 ? (totalHits / totalBets) * 100 : 0;
                
                var cvResult = performCrossValidation(periods, patternMatches);
                
                var positiveCount = patternMatches.length;
                
                console.log('[AI Worker] Training complete - periodHits:', totalHits, '/', count, 'periods (', periodHitRate.toFixed(2) + '%)');
                console.log('[AI Worker] Positive patterns generated:', positiveCount);
                console.log('[AI Worker] Pattern features length:', patternMatches.length > 0 ? patternMatches[0].features.length : 0);
                
                patternMatches.sort(function(a, b) {
                    return (b.priority || 0) - (a.priority || 0);
                });
                
                var patternsToSend = patternMatches.slice(0, 300);
                console.log('[AI Worker] Patterns to send:', patternsToSend.length);
                console.log('[AI Worker] First pattern version:', patternsToSend.length > 0 ? patternsToSend[0].version : 'N/A');
                
                self.postMessage({ 
                    type: 'complete', 
                    totalSimulations: count, 
                    totalHits: totalHits, 
                    hitRate: periodHitRate,
                    periodHitRate: periodHitRate,
                    betHitRate: betHitRate,
                    patterns: patternsToSend,
                    cvResult: cvResult,
                    weights: JSON.parse(JSON.stringify(reinforcementWeights))
                });
            }
        }
        
        processBatch();
    }
};