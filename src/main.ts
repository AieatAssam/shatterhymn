import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import './styles/main.css';

import { startArena } from "./render/renderer";
const canvas = document.querySelector<HTMLCanvasElement>("#gl");
if (canvas) startArena(canvas);
