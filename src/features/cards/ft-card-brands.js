/**
 * Logos de bandeira para cartões (SVG inline).
 * Mastercard: círculos oficiais. Demais: placa branca com nome da bandeira.
 */
(function (global) {
  'use strict';

  function wrap(svg, cls) {
    cls = cls || 'cc-card-brand';
    return '<div class="' + cls + '" aria-hidden="true">' + svg + '</div>';
  }

  /** Placa branca, borda sutil, texto centralizado. */
  function textBadge(label, width, height, fontSize, letterSpacing) {
    var w = width || 44;
    var h = height || 20;
    var fs = fontSize || 9;
    var ls = letterSpacing != null ? letterSpacing : 0.6;
    var textY = h / 2 + fs * 0.36;
    return (
      '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (h - 1) + '" rx="3.5" fill="#FFFFFF" stroke="rgba(0,0,0,0.14)" stroke-width="1"/>' +
      '<text x="' + (w / 2) + '" y="' + textY + '" text-anchor="middle" fill="#1A1F36" font-family="Arial,Helvetica,sans-serif" font-size="' + fs + '" font-weight="700" letter-spacing="' + ls + '">' + label + '</text>' +
      '</svg>'
    );
  }

  var SVG = {
    visa: textBadge('VISA', 46, 20, 10, 1.2),

    master:
      '<svg width="44" height="28" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="16" cy="14" r="11" fill="#EB001B"/>' +
      '<circle cx="28" cy="14" r="11" fill="#F79E1B" fill-opacity="0.95"/>' +
      '</svg>',

    elo: textBadge('ELO', 40, 20, 10, 1.4),

    amex: textBadge('AMEX', 46, 20, 8.5, 1),

    other:
      '<svg width="36" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="2" y="5" width="20" height="14" rx="2" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>' +
      '<line x1="2" y1="10" x2="22" y2="10" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>' +
      '</svg>'
  };

  function brandMarkup(brand, wrapClass) {
    var key = brand && SVG[brand] ? brand : 'other';
    var cls = wrapClass || 'cc-card-brand';
    if (key === 'visa' || key === 'elo' || key === 'amex') {
      cls += ' cc-card-brand--badge';
    }
    return wrap(SVG[key], cls);
  }

  global.FTCardBrands = {
    brandMarkup: brandMarkup,
    svg: SVG
  };
})(typeof window !== 'undefined' ? window : globalThis);
