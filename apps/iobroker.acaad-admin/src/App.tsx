import React from 'react';
import './App.css';
import { GenericApp, GenericAppProps, I18n } from '@iobroker/adapter-react-v5';

import deLocal from './i18n/de.json';
import enLocal from './i18n/en.json';
import esLocal from './i18n/es.json';
import frLocal from './i18n/fr.json';
import itLocal from './i18n/it.json';
import nlLocal from './i18n/nl.json';
import plLocal from './i18n/pl.json';
import ptLocal from './i18n/pt.json';
import ruLocal from './i18n/ru.json';
import ukLocal from './i18n/uk.json';
import zhCnLocal from './i18n/zh-cn.json';

class App extends GenericApp {
  private readonly translations: Record<
    ioBroker.Languages,
    Record<string, string>
  >;

  constructor(props: GenericAppProps) {
    const extendedProps = { ...props };
    extendedProps.encryptedFields = ['pass']; // this parameter will be encrypted and decrypted automatically

    // get actual admin port
    extendedProps.socket = { port: parseInt(window.location.port, 10) };

    super(props, extendedProps);

    this.translations = {
      en: enLocal,
      de: deLocal,
      ru: ruLocal,
      pt: ptLocal,
      nl: nlLocal,
      fr: frLocal,
      it: itLocal,
      es: esLocal,
      pl: plLocal,
      uk: ukLocal,
      'zh-cn': zhCnLocal,
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
