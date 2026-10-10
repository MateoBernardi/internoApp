import { partirLinks } from '../LinkifiedText';

describe('partirLinks', () => {
  it('devuelve texto plano sin links', () => {
    expect(partirLinks('hola mundo')).toEqual([{ texto: 'hola mundo' }]);
    expect(partirLinks('')).toEqual([]);
  });

  it('detecta http(s) y quita la puntuación final', () => {
    expect(partirLinks('mirá https://example.com.')).toEqual([
      { texto: 'mirá ' },
      { texto: 'https://example.com', href: 'https://example.com' },
      { texto: '.' },
    ]);
  });

  it('normaliza www. a https y conserva query y path', () => {
    expect(partirLinks('www.example.com/a?b=1, gracias')).toEqual([
      { texto: 'www.example.com/a?b=1', href: 'https://www.example.com/a?b=1' },
      { texto: ', gracias' },
    ]);
  });

  it('conserva los paréntesis balanceados y quita el de cierre suelto', () => {
    expect(partirLinks('(ver https://es.wikipedia.org/wiki/A_(b))')[1]).toEqual({
      texto: 'https://es.wikipedia.org/wiki/A_(b)',
      href: 'https://es.wikipedia.org/wiki/A_(b)',
    });
    expect(partirLinks('(https://a.com)')[1]).toEqual({ texto: 'https://a.com', href: 'https://a.com' });
  });

  it('no linkifica esquemas peligrosos ni un prefijo solo', () => {
    expect(partirLinks('javascript:alert(1) y https://')).toEqual([{ texto: 'javascript:alert(1) y https://' }]);
  });
});
