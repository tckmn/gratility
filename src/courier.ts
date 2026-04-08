export function alert(msg: string) {
    if (typeof document === 'undefined') {
        console.error(msg);
    } else {
        const alerts = document.getElementById('alerts')!;

        const elt = document.createElement('div');
        elt.textContent = msg;
        const rm = () => {
            alerts.removeChild(elt);
        };
        elt.addEventListener('click', rm);
        setTimeout(rm, Math.max(3000, 250*msg.length));

        alerts.insertBefore(elt, alerts.firstChild);
    }
}
