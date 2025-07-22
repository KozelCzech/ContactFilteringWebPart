export function getContrastColor(hexColor: string | undefined): string {
    if (!hexColor)
    {
        return '#000000';
    }

    
    let processedHex = hexColor;

    if (processedHex.startsWith('#')) {
        processedHex = processedHex.slice(1);
    }

    if (processedHex.length === 3) {
        processedHex = processedHex.split('').map(char => char + char).join('')
    }

    const r = parseInt(processedHex.slice(0, 2), 16);
    const g = parseInt(processedHex.slice(2, 4), 16);
    const b = parseInt(processedHex.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '#000000';
    }

    const luminance = (r * 299 + g * 587 + b * 114) / 1000;

    return luminance < 128 ? '#FFFFFF' : '#000000';
}


export function isValidColor(color: string): boolean {
    const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return regex.test(color);

}