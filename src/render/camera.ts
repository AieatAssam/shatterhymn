import { PerspectiveCamera, MathUtils } from "three";
import { ARENA_HEIGHT, ARENA_RADIUS, ARENA_WIDTH, CAMERA_FOV, CAMERA_TILT } from "./fxConfig";
export function fitCameraDistance(fovDeg: number, aspect: number, boxW: number, boxH: number, radius: number): number {
  const tangent = Math.tan(fovDeg * Math.PI / 360);
  return Math.max(radius / (tangent * aspect * boxW), radius / (tangent * boxH));
}
export function fitCamera(camera: PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect;
  const distance = fitCameraDistance(CAMERA_FOV, aspect, ARENA_WIDTH, ARENA_HEIGHT, ARENA_RADIUS);
  const tilt = MathUtils.degToRad(CAMERA_TILT);
  camera.position.set(0, -distance * Math.sin(tilt), distance * Math.cos(tilt));
  camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
}

export function fitSliceCamera(camera:PerspectiveCamera, aspect:number, areaFraction=1):void { camera.aspect=aspect;camera.fov=30;camera.position.set(0,0,5/Math.tan(Math.PI/12)/areaFraction);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.clearViewOffset();camera.updateProjectionMatrix(); }
