import { render } from 'preact';
import { loadLanguage } from '@/lib/i18n';
import { App } from './App';
import './style.css';

loadLanguage().then(() => {
  render(<App />, document.getElementById('app')!);
});
