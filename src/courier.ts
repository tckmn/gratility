export function alert(msg: string) {
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
