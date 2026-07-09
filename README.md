# Mis Gastos Pro

PWA instalable estilo iOS para controlar gastos de tarjetas, pagos pendientes y calendario.

## Qué incluye
- Diseño mobile-first tipo iOS.
- Instalable como acceso directo desde Safari/Chrome.
- Registro de gasto, monto pagado y restante.
- Calendario de futuros pagos.
- Calculadora interna.
- Tarjetas personalizables.
- Exportación e importación JSON.
- Campo preparado para endpoint de integración con CuentasTRAS.

## Subir a GitHub
1. Crea un repo nuevo.
2. Sube todos estos archivos.
3. Activa GitHub Pages en Settings > Pages > Deploy from branch > main.
4. Abre la URL en el celular y usa “Agregar a pantalla de inicio”.

## Estructura JSON
```json
{
  "expenses": [],
  "cards": ["BBVA", "Banamex", "Nu", "Apple Card"],
  "apiUrl": ""
}
```

## Actualización tarjetas de crédito
- Para tarjetas se captura solo saldo, fecha de corte, fechas buenas para comprar y fecha límite de pago.
- Encargos mantiene monto total, a cuenta, abonos posteriores y edición para agregar más pagos.

## Integración con CuentaAtrás

En la pestaña JSON pega la URL pública de tu app CuentaAtrás de GitHub Pages, por ejemplo:

```text
https://TU-USUARIO.github.io/cuentaAtras-main/
```

Después, en cualquier movimiento aparece el botón **Aviso**. Ese botón abre CuentaAtrás con el título, fecha límite, categoría y notas ya preparadas para guardar el recordatorio.

Para que se llene automático, tu app CuentaAtrás necesita aceptar parámetros URL. Incluí una versión compatible en el ZIP `cuentaAtras-main-con-parametros.zip`.
