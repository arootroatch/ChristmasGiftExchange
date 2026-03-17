import {describe, expect, it} from 'vitest';
import {defmulti} from '../../netlify/shared/multimethod.mjs';

describe('defmulti', () => {
    it('dispatches to registered method based on dispatch function', () => {
        const greet = defmulti((lang) => lang);
        greet.defmethod('en', (lang) => 'hello');
        greet.defmethod('es', (lang) => 'hola');

        expect(greet('en')).toBe('hello');
        expect(greet('es')).toBe('hola');
    });

    it('throws when no method registered for dispatch value', () => {
        const greet = defmulti((lang) => lang);

        expect(() => greet('fr')).toThrow('No method for dispatch value: fr');
    });

    it('supports dispatch functions that derive from arguments', () => {
        const area = defmulti((shape) => shape.type);
        area.defmethod('circle', (shape) => Math.PI * shape.r ** 2);
        area.defmethod('rect', (shape) => shape.w * shape.h);

        expect(area({type: 'circle', r: 1})).toBeCloseTo(Math.PI);
        expect(area({type: 'rect', w: 3, h: 4})).toBe(12);
    });

    it('keeps separate registries for independent multimethods', () => {
        const dispatch = (x) => x;
        const a = defmulti(dispatch);
        const b = defmulti(dispatch);
        a.defmethod('x', () => 'from-a');
        b.defmethod('x', () => 'from-b');

        expect(a('x')).toBe('from-a');
        expect(b('x')).toBe('from-b');
    });
});
