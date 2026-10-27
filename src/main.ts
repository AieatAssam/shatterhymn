import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import './styles/main.css';

import { Controller } from "./game/controller";
const canvas = document.querySelector<HTMLCanvasElement>("#gl");
const surface = document.querySelector<HTMLElement>("#surface");
if (canvas && surface) new Controller(canvas, surface);
