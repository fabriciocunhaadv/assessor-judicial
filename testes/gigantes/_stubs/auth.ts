export type User = any;
export class GoogleAuthProvider { setCustomParameters(_: any) {} }
export class OAuthProvider { constructor(_id?: string) {} setCustomParameters(_: any) {} }
export const getAuth = (_a?: any) => ({ currentUser: { uid: "teste-uid", email: (globalThis as any).__emailTeste || "fabriciocunha.adv@gmail.com", displayName: "Fabricio (teste)", photoURL: null, getIdToken: async () => "x" } });
export const onAuthStateChanged = (auth: any, cb: (u: any) => void) => { setTimeout(() => cb(auth.currentUser), 50); return () => {}; };
export const signInWithPopup = async () => ({ user: getAuth().currentUser });
export const signInWithRedirect = async () => {};
export const signOut = async () => {};
