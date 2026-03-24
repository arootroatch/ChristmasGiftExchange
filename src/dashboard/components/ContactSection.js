import * as contactForm from './ContactForm.js';
import {selectElement} from '../../utils.js';

export function init() {
  const container = selectElement('#section-contact');
  container.innerHTML = '<div data-slot="contact"></div>';

  contactForm.init();
}
