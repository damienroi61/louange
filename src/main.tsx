import { createRoot } from 'react-dom/client';
import './styles.css';
import { OutputApp } from './output/OutputApp';
import { StageApp } from './stage/StageApp';
import { OperatorApp } from './operator/OperatorApp';

const route = window.location.hash.replace(/^#\/?/, '');
const root = createRoot(document.getElementById('root')!);
document.body.dataset.route = route || 'operator';

if (route.startsWith('output')) root.render(<OutputApp />);
else if (route.startsWith('stage')) root.render(<StageApp />);
else root.render(<OperatorApp />);
