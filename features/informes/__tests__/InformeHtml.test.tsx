import { render } from '@testing-library/react-native';
import React from 'react';
import { InformeHtml } from '../components/InformeHtml';

describe('InformeHtml', () => {
  it('muestra el nombre en la píldora de mención, nunca el id', () => {
    const { getByText, queryByText } = render(
      <InformeHtml html='<p>Hola <span data-mention="2">Ana Pérez</span></p>' miId={5} />,
    );
    expect(getByText(/Ana Pérez/)).toBeTruthy();
    expect(queryByText(/@2/)).toBeNull();
  });

  it('ignora scripts, imágenes y enlaces no http(s)', () => {
    const { queryByText, getByText } = render(
      <InformeHtml html='<p>ok<script>alert(1)</script><img src="x"><a href="javascript:alert(1)">link</a></p>' />,
    );
    expect(queryByText(/alert/)).toBeNull();
    expect(getByText(/link/).props.onPress).toBeUndefined();
  });

  it('renderiza listas', () => {
    const { getByText, getAllByText } = render(<InformeHtml html="<ul><li>uno</li><li>dos</li></ul><ol><li>tres</li></ol>" />);
    expect(getByText('uno')).toBeTruthy();
    expect(getAllByText('•')).toBeTruthy();
    expect(getByText('1.')).toBeTruthy();
  });
});
