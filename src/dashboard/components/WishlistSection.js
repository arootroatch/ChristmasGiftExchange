import * as wishlistList from './WishlistList.js';
import * as itemList from './ItemList.js';
import * as saveButton from './SaveButton.js';
import {selectElement} from '../../utils.js';

export function init() {
  const container = selectElement('#section-wishlist');
  container.innerHTML = `
    <div data-slot="wishlists"></div>
    <div data-slot="items"></div>
    <div data-slot="save"></div>`;

  wishlistList.init();
  itemList.init();
  saveButton.init();
}
