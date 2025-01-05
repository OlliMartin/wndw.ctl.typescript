import React from 'react';
import logo from './logo.svg';
import './App.css';
import {
  GenericApp,
  GenericAppProps,
  dictionary,
  I18n,
  AdminConnection,
} from '@iobroker/adapter-react-v5';

import enLocal from './i18n/en.json';
import deLocal from './i18n/de.json';

class App extends GenericApp {
  private readonly translations: Record<
    ioBroker.Languages,
    Record<string, string>
  >;

  constructor(props: GenericAppProps) {
    const extendedProps = { ...props };
    extendedProps.encryptedFields = ['pass']; // this parameter will be encrypted and decrypted automatically

    extendedProps.translations = {
      en: enLocal,
      de: deLocal,
    };

    // get actual admin port
    extendedProps.socket = { port: parseInt(window.location.port, 10) };

    super(props, extendedProps);

    this.translations = {
      en: enLocal,
      de: deLocal,
      ru: enLocal,
      pt: enLocal,
      nl: enLocal,
      fr: enLocal,
      it: enLocal,
      es: enLocal,
      pl: enLocal,
      uk: enLocal,
      'zh-cn': enLocal,
    };

    // TODO: Translations commented out

    // merge together
    // Object.keys(translations).forEach((lang: ioBroker.Languages) =>
    //     Object.assign(this.translations[lang], translations[lang]),
    // );

    // init translations
    I18n.setTranslations(this.translations);
    I18n.setLanguage(
      (window.navigator.language || 'en')
        .substring(0, 2)
        .toLowerCase() as ioBroker.Languages
    );

    // Only if close, save buttons are not required at the bottom (e.g. if admin tab)
    // extendedProps.bottomButtons = false;

    // only for debug purposes
    if (extendedProps.socket.port === 3000) {
      extendedProps.socket.port = 8081;
    }

    // allow to manage GenericApp the sentry initialisation or do not set the sentryDSN if no sentry available
    // extendedProps.sentryDSN = 'https://yyy@sentry.iobroker.net/xx';
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
