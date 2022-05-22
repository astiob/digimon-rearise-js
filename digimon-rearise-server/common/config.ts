export const appVersion = '99.9.0'
export const baseUrl = {
    jp: 'https://toothless.drago.nz/dra',
    ww: 'https://toothless.drago.nz/dra',
}
export const officialBaseUrl = {
    jp: 'https://cache.digi-rise.com',
    ww: 'https://digirige-os-cache.channel.or.jp',
}
export function isCustomBaseUrl(): boolean {
    return !baseUrl.jp.match(/^https:\/\/(cache\.digi-rise\.com|digirige-os-cache\.channel\.or\.jp)$/)
}