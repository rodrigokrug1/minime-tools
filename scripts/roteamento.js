// CloudFront Function, evento viewer-request.
//
// Existe por um motivo: o endpoint REST do S3, o único que aceita Origin
// Access Control, não tem documento de índice. O Astro gera
// `ferramentas/base64/index.html`, mas o pedido chega como
// `/ferramentas/base64/` — chave que não existe no bucket. Como a política
// concede só `s3:GetObject`, sem `ListBucket`, o S3 responde AccessDenied em
// vez de 404. Esta função reescreve a URI antes de o pedido chegar à origem.
//
// De quebra, manda `www` para o apex com 301, para o buscador não tratar dois
// endereços com o mesmo conteúdo como páginas concorrentes.
//
// O runtime é o cloudfront-js-2.0: ES 5.1 com parte do ES 6-12. `const`,
// arrow e template literal entram; métodos mais novos de String, como
// `endsWith` e `includes`, ficam de fora por não estarem na lista garantida.
// biome-ignore lint/correctness/noUnusedVariables: o CloudFront chama `handler` por convenção; nada no repositório a importa.
function handler(event) {
  const request = event.request;
  const host = request.headers.host ? request.headers.host.value : '';

  if (host.indexOf('www.') === 0) {
    const query = Object.keys(request.querystring)
      .map((chave) => `${chave}=${request.querystring[chave].value}`)
      .join('&');

    const caminho = query ? `${request.uri}?${query}` : request.uri;

    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: `https://${host.substring(4)}${caminho}` } },
    };
  }

  const uri = request.uri;

  // Termina em barra: serve o index.html daquele diretório.
  if (uri.slice(-1) === '/') {
    request.uri = `${uri}index.html`;
    return request;
  }

  // Sem ponto no último segmento: é uma rota, não um arquivo. O teste olha só
  // o último segmento para não confundir um ponto no meio do caminho com uma
  // extensão.
  const ultimoSegmento = uri.substring(uri.lastIndexOf('/') + 1);

  if (ultimoSegmento.indexOf('.') === -1) {
    request.uri = `${uri}/index.html`;
  }

  return request;
}
