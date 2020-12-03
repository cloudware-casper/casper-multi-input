import './casper-multi-input-tag.js';
import '@cloudware-casper/casper-icons/casper-icon-button.js';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';

class CasperMultiInput extends PolymerElement {

  static get BACKSPACE_KEY_CODE () { return 8; }
  static get TAB_KEY_CODE () { return 9; }

  static get properties () {
    return {
      /**
       * This flag states if the input is currently focused which will trigger an animation if it is.
       *
       * @type {Boolean}
       */
      focused: {
        type: Boolean,
        reflectToAttribute: true
      },
      /**
       * The input's placeholder.
       *
       * @type {String}
       */
      placeholder: String,
      /**
       * This property defines the type of the casper-multi-input which should have a specific regular expression
       * to check each value.
       *
       * @type {String}
       */
      type: String,
      /**
       * The list of valid values.
       *
       * @type {Array}
       */
      values: {
        type: Array,
        value: () => ([]),
        observer: '__valuesChanged'
      },
      /**
       * An array containing all the values, including the invalid ones.
       *
       * @type {Array}
       */
      __internalValues: {
        type: Array,
        value: () => ([]),
        observer: '__internalValuesChanged'
      },
      /**
       * An object containing the regular expressions per type of input.
       *
       * @type {Object}
       */
      __regularExpressionsPerType: {
        type: Object,
        value: () => ({
          email: /^\S+@\S+$/
        })
      },
      /**
       * The list of characters that should be used to separate values.
       *
       * @type {String}
       */
      __separatorCharacters: {
        type: String,
        value: [',', ' ', 'Tab']
      }
    };
  }

  static get template () {
    return html`
      <style>
        :host {
          --paper-container-input-color: #444444;
          --paper-container-input-font-size: 1rem;
          --paper-container-default-height: 46px;
          --paper-container-unfocused-border-color: #737373;
        }

        #outer-container {
          width: 100%;
          padding: 8px 0;
          min-height: var(--paper-container-default-height);
        }

        #outer-container #container {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          /* Remove two pixels because of the underline */
          min-height: calc(var(--paper-container-default-height) - 2px);
        }

        #outer-container #container casper-multi-input-tag {
          height: 20px;
          margin-right: 4px;
          margin-bottom: 4px;
        }

        #outer-container #container input {
          padding: 0;
          height: 24px;
          flex-grow: 1;
          border: none;
          outline: none;
          font-family: inherit;
          color: var(--paper-container-input-color);
          font-size: var(--paper-container-input-font-size);
          -webkit-font-smoothing: antialiased;
        }

        #outer-container .underline {
          height: 2px;
          width: 100%;
          position: relative;
        }

        #outer-container .underline .focused-line,
        #outer-container .underline .unfocused-line {
          bottom: 0;
          width: 100%;
          position: absolute;
        }

        #outer-container .underline .unfocused-line {
          height: 1px;
          background-color: var(--paper-container-unfocused-border-color);
        }

        #outer-container .underline .focused-line {
          height: 2px;
          background-color: var(--primary-color);
          transform: scale3d(0, 1, 1);
          transform-origin: center center;
          transition: transform 250ms;
        }

        :host([focused]) #outer-container .focused-line {
          transform: none;
        }
      </style>

      <div id="outer-container">
        <div id="container">
          <template is="dom-repeat" items="[[__internalValues]]">
            <casper-multi-input-tag invalid$="[[item.invalid]]" on-click="__removeOrUpdateValue">
              [[item.value]]
            </casper-multi-input-tag>
          </template>

          <input id="input" placeholder="[[placeholder]]" />
        </div>

        <!--This is supposed to mimic the paper-input's behavior-->
        <div class="underline">
          <div class="unfocused-line"></div>
          <div class="focused-line"></div>
        </div>
      </div>
    `;
  }

  ready () {
    super.ready();

    this.$.input.addEventListener('blur', () => { this.focused = false; });
    this.$.input.addEventListener('focus', () => { this.focused = true; });
    this.$.input.addEventListener('keydown', event => this.__onKeyDown(event));
  }

  /**
   * This method is invoked when the user clicks on one of the existing tags and evalutes
   * if the user is trying to edit or remove an existing value given the event's target.
   *
   * @param {Object} event The event's object.
   */
  __removeOrUpdateValue (event) {
    const eventComposedPath = event.composedPath();
    const valueIndex = [...event.target.parentNode.children].indexOf(event.target);

    eventComposedPath.shift().nodeName.toLowerCase() === 'casper-icon'
      ? this.__removeValue(valueIndex)
      : this.__updateValue(valueIndex);
  }

  /**
   * This method will remove the existing value in the given index.
   *
   * @param {Number} valueIndex The value's index.
   */
  __removeValue (valueIndex) {
    this.__internalValues = this.__internalValues.filter((_, index) => index !== valueIndex);
  }

  /**
   * This method will update the existing value in the given index, saving the current input content into a new value.
   *
   * @param {Number} valueIndex The value's index.
   */
  __updateValue (valueIndex) {
    if (this.$.input.value) this.__pushValue(this.$.input.value);

    this.$.input.value = this.__internalValues[valueIndex].value;
    this.__removeValue(valueIndex);
  }

  /**
   * This method handles the input's keydown events.
   *
   * @param {Object} event The event's object.
   */
  __onKeyDown (event) {
    event.keyCode === CasperMultiInput.BACKSPACE_KEY_CODE
      ? this.__backspaceKeyDown()
      : this.__remainingKeysDown(event);
  }

  /**
   * This method specifically handles the input's backspace keydown events.
   */
  __backspaceKeyDown () {
    // If the input contains any value, ignore the backspace.
    if (this.$.input.value) return;

    this.__internalValues.pop();
    this.__internalValues = [...this.__internalValues];
  }

  /**
   * This method handles the remaining input's keydown events.
   *
   * @param {Object} event The event's object.
   */
  __remainingKeysDown (event) {
    // Completely ignore this method if we're not dealing with one of the separator characters.
    if (!this.__separatorCharacters.includes(event.key)) return;

    // Prevent the space and the comma if the input doesn't have any value.
    if (!this.$.input.value) {
      // Tab is a special child here and we must not prevent it's default behaviour.
      if (event.key === 'Tab') return;

      return event.preventDefault();
    } 

    this.__pushValue(this.$.input.value);
    setTimeout(() => this.$.input.value = '', 0);
  }

  /**
   * This method returns an object containing the new value and a flag stating its validity.
   *
   * @param {String} value The value that shall be created.
   */
  __createValue (value) {
    const regularExpression = this.__regularExpressionsPerType[this.type];

    return {
      value,
      invalid: regularExpression && !regularExpression.test(value)
    };
  }

  /**
   * This method adds a new value to the list of existing ones.
   *
   * @param {String} value The new value we're adding.
   */
  __pushValue (value) {
    this.__internalValues = [...this.__internalValues, this.__createValue(value)];
  }

  /**
   * This observer is invoked when the values property changes.
   */
  __valuesChanged () {
    // This is used to avoid observer loops since the values and __internalValues properties alter each other.
    if (this.__valuesLock || !this.values) return;

    this.__internalValuesLock = true;
    this.__internalValues = [this.values].flat().map(value => this.__createValue(value));
    this.__internalValuesLock = false;
  }

  /**
   * This observer is invoked when the __internalValues property changes.
   */
  __internalValuesChanged () {
    // This is used to avoid observer loops since the values and __internalValues properties alter each other.
    if (this.__internalValuesLock) return;

    this.__valuesLock = true;
    this.values = this.__internalValues
      .filter(internalValue => !internalValue.invalid)
      .map(internalValue => internalValue.value);
    this.__valuesLock = false;
  }
}

window.customElements.define('casper-multi-input', CasperMultiInput);