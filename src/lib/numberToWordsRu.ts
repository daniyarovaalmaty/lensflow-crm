export function numberToWordsRu(n: number): string {
    const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const onesFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    const getGroup = (group: number, gender: 'm' | 'f' = 'm'): string => {
        let result = '';
        const h = Math.floor(group / 100);
        const t = Math.floor((group % 100) / 10);
        const o = group % 10;

        if (h > 0) result += hundreds[h] + ' ';
        if (t === 1) {
            result += teens[o] + ' ';
        } else {
            if (t > 1) result += tens[t] + ' ';
            if (o > 0) result += (gender === 'm' ? ones[o] : onesFemale[o]) + ' ';
        }
        return result.trim();
    };

    if (n === 0) return 'ноль';

    let words = [];
    
    // Billions
    const billions = Math.floor(n / 1000000000);
    if (billions > 0) {
        words.push(getGroup(billions, 'm'));
        const rem = billions % 100;
        const o = rem % 10;
        if (rem >= 11 && rem <= 19) words.push('миллиардов');
        else if (o === 1) words.push('миллиард');
        else if (o >= 2 && o <= 4) words.push('миллиарда');
        else words.push('миллиардов');
    }
    
    // Millions
    n %= 1000000000;
    const millions = Math.floor(n / 1000000);
    if (millions > 0) {
        words.push(getGroup(millions, 'm'));
        const rem = millions % 100;
        const o = rem % 10;
        if (rem >= 11 && rem <= 19) words.push('миллионов');
        else if (o === 1) words.push('миллион');
        else if (o >= 2 && o <= 4) words.push('миллиона');
        else words.push('миллионов');
    }

    // Thousands
    n %= 1000000;
    const thousands = Math.floor(n / 1000);
    if (thousands > 0) {
        words.push(getGroup(thousands, 'f'));
        const rem = thousands % 100;
        const o = rem % 10;
        if (rem >= 11 && rem <= 19) words.push('тысяч');
        else if (o === 1) words.push('тысяча');
        else if (o >= 2 && o <= 4) words.push('тысячи');
        else words.push('тысяч');
    }

    // Units
    n %= 1000;
    if (n > 0 || words.length === 0) {
        const unitsStr = getGroup(n, 'm');
        if (unitsStr) words.push(unitsStr);
    }

    let finalStr = words.join(' ');
    // Capitalize first letter
    return finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
}
