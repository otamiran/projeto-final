// Gera um par de chaves VAPID (formato usado pelo Web Push) usando
// apenas o módulo nativo "crypto" do Node — sem depender de pacotes externos.
const crypto = require('crypto')

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256, exigido pelo padrão Web Push
})

// Chave pública: formato "ponto não comprimido" (65 bytes, começa com 0x04)
const pubJwk = publicKey.export({ format: 'jwk' })
const x = Buffer.from(pubJwk.x, 'base64')
const y = Buffer.from(pubJwk.y, 'base64')
const pontoPublico = Buffer.concat([Buffer.from([0x04]), x, y])

// Chave privada: apenas o escalar "d" (32 bytes)
const privJwk = privateKey.export({ format: 'jwk' })
const d = Buffer.from(privJwk.d, 'base64')

console.log('VAPID_PUBLIC_KEY=' + base64url(pontoPublico))
console.log('VAPID_PRIVATE_KEY=' + base64url(d))
