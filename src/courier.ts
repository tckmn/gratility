export function alert(msg: string) {
    if (typeof document === 'undefined') {
        console.error(msg);
    } else {
        const alerts = document.getElementById('alerts')!;
        const elt = document.createElement('div');
        elt.textContent = msg;
        const rm = () => { elt.remove(); };
        elt.addEventListener('click', rm);
        setTimeout(rm, Math.max(3000, 250*msg.length));
        alerts.prepend(elt);
    }
}
