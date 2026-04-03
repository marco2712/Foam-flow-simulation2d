import os
import time
import warnings

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import Normalize

"""Simulación 2D por elementos finitos con pérdida de especie.

Existen DOS modos de transporte de nD (variable ND_MODE):

  'local_eq'  (Validado): nD = nD_LE(Sw) en cada celda y paso de tiempo.
              El frente de nD es idéntico al de Sw por construcción.
              Físicamente representa equilibrio local instantáneo.

  'kinetic'   (En construcción) Ecuación de transporte con advección corregida. En lugar
              de advectar con Fg*nD (velocidad del gas), se advecta con
              la velocidad total del frente usando fw*nD + Fg*nD = nD,
              es decir, nD se mueve con la velocidad intersticial total:
                  u_total/phi * nD
              y la cinética Phi_foam actúa como corrección de equilibrio.
"""

try:
    from IPython.display import clear_output
except ImportError:
    def clear_output(wait=False):
        return None

warnings.filterwarnings('ignore')
print('OK')

# =============================================================================
# OPCIÓN PRINCIPAL: Modo de transporte de nD
# =============================================================================
# 'local_eq' -> nD = nD_LE(Sw) instantáneo (frente perfectamente alineado)
# 'kinetic'  -> Ecuación de transporte corregida con cinética
ND_MODE = 'local_eq'   # <-- revertido a local_eq
#D_MODE= 'kinetic'
# =============================================================================
# Physical parameters
# =============================================================================
phi1 = 0.25
phi2 = 0.2
Swc  = 0.20
Sgr  = 0.18
mu_w = 1e-3
mu_g = 2e-5
k1   = 2e-12
k2   = 1e-12
Sw_star = 0.37
A    = 400.0
Kc   = 200.0
theta_s = 3.2e-4
u1 = 2.93e-6
#u2 = u1 * (k2 / k1) * (phi1 / phi2)
u2=0.5*u1 #siempre será una proporción de u1.
d      = 5e-3

# =============================================================================
# Controladores de Visualización 1D
# =============================================================================
# Altura de extracción de perfiles 1D (0.0 = Interfaz, 1.0 = Borde lejano externo)
Z_EXTRACT_L1 = 0.5# Capa 1
Z_EXTRACT_L2 = 0.5 # Capa 2
# Tamaño de ventana para la Media Móvil (Filtro 1D Onda Viajante)
W_SIZE_1D = 2
# Límites de Graficación Zoom (Eje X) para el perfil 1D

sigma  = 0.03
c_cap  = 0.01
Sw_minus = 0.372
Sw_plus  = 0.72
UMBRAL_FRENTE = (Sw_minus + Sw_plus) / 2.0

# Especie C
C_inj = 1.0
C_ini = 0.0
D_c   = 2e-9
k_ads0 = 1.2e-4
k_deg  = 2.0e-5
beta_foam_ads = 0.65
CONSIDERAR_C  = False

print(f'k1={k1:.0e}  k2={k2:.0e}  k2/k1={k2/k1:.2f}')
print(f'u1={u1:.3e}  u2={u2:.3e}  u2/u1={u2/u1:.3f}')
print(f'Sw-={Sw_minus}  Sw+={Sw_plus}  umbral={UMBRAL_FRENTE:.4f}')
print(f'ND_MODE = {ND_MODE!r}')

SIN_GRAFICAS      = os.getenv('SIN_GRAFICAS',       '0') == '1'
MODO_PRUEBA       = os.getenv('MODO_PRUEBA',        '0') == '1'
MODO_INTERACTIVO  = os.getenv('MODO_INTERACTIVO',   '1') == '1'
USAR_CLEAR_OUTPUT = os.getenv('USAR_CLEAR_OUTPUT',  '0') == '1'

# =============================================================================
# Malla 2D
# =============================================================================
L  = 0.6
Nx = 300
Nz = 50
XMIN_1D = 0
XMAX_1D = L-0.1

x  = np.linspace(0.0, L, Nx + 1)
z  = np.linspace(-d,  d, Nz + 1)
dx = x[1] - x[0]
dz = z[1] - z[0]

X, Z = np.meshgrid(x, z)

mask1 = Z > 0.0
rows1 = np.where(z > 0.0)[0]
rows2 = np.where(z <= 0.0)[0]

k_2d   = np.where(mask1, k1,   k2)
u_2d   = np.where(mask1, u1,   u2)
phi_2d = np.where(mask1, phi1, phi2)

Tmax = 10000.0
dt   = 0.30
eps_nD = 1e-5
if MODO_PRUEBA:
    Tmax = float(os.getenv('TMAX_PRUEBA', '120.0'))
Nt = int(Tmax / dt)

if (not SIN_GRAFICAS) and MODO_INTERACTIVO:
    plt.ion()

print(f'Nx={Nx}  Nz={Nz}  dx={dx*1e3:.2f}mm  dz={dz*1e3:.2f}mm')
print(f'Nt={Nt}  dt={dt}s  Tmax={Tmax}s')


# =============================================================================
# Relaciones constitutivas
# =============================================================================
def krw(Sw):
    return 0.2 * np.clip((Sw - Swc) / (1 - Swc - Sgr), 0, 1) ** 4.2

def krg0(Sw):
    return 0.94 * np.clip((1 - Sw - Sgr) / (1 - Swc - Sgr), 0, 1) ** 1.3

def MRF(nD):
    return np.clip(18500.0 * nD + 1.0, 1.0, 1e7)

def nD_LE(Sw):
    return np.where(Sw > Sw_star, np.tanh(A * (Sw - Sw_star)), 0.0)

def fw(Sw, nD, k_b):
    lw = k_b * krw(Sw) / mu_w
    lg = k_b * krg0(Sw) / MRF(nD) / mu_g
    return lw / (lw + lg + 1e-30)

def lambda_t(Sw, nD, k_b):
    lw = k_b * krw(Sw) / mu_w
    lg = k_b * krg0(Sw) / MRF(nD) / mu_g
    return lw + lg

def Phi_foam(Sw, nD):
    return Kc * (nD_LE(Sw) - nD)

def Pc(Sw, k_b, phi_b):
    return (
        sigma * np.sqrt(phi_b / k_b) * 0.022
        * np.clip(1 - Sw - Sgr, 1e-8, 1) ** c_cap
        / np.clip(Sw - Swc, 1e-8, 1)
    )

def dPc_dSw(Sw, k_b, phi_b):
    h   = 1e-5
    Swp = np.clip(Sw + h, Swc + 1e-6, 1 - Sgr - 1e-6)
    Swm = np.clip(Sw - h, Swc + 1e-6, 1 - Sgr - 1e-6)
    return (Pc(Swp, k_b, phi_b) - Pc(Swm, k_b, phi_b)) / (2 * h)

def D_cap(Sw, nD, k_b, phi_b):
    lg = k_b * krg0(Sw) / MRF(nD) / mu_g
    return -lg * fw(Sw, nD, k_b) * dPc_dSw(Sw, k_b, phi_b)


# =============================================================================
# Estimaciones teóricas
# =============================================================================
Sw_t = np.array([Sw_minus, 0.5, Sw_plus])
nD_t = nD_LE(Sw_t)
print('fw(k1):', fw(Sw_t, nD_t, k1).round(4))
print('fw(k2):', fw(Sw_t, nD_t, k2).round(4))

nDp   = nD_LE(np.array([Sw_plus]))[0]
nDm   = nD_LE(np.array([Sw_minus]))[0]
fw1p  = fw(np.array([Sw_plus]),  np.array([nDp]), k1)[0]
fw1m  = fw(np.array([Sw_minus]), np.array([nDm]), k1)[0]
fw2p  = fw(np.array([Sw_plus]),  np.array([nDp]), k2)[0]
fw2m  = fw(np.array([Sw_minus]), np.array([nDm]), k2)[0]
dSw   = Sw_plus - Sw_minus

v1_iso    = (u1 / phi1) * (fw1p - fw1m) / dSw
v2_iso    = (u2 / phi2) * (fw2p - fw2m) / dSw
a1        = phi1 * dSw * theta_s
a2        = phi2 * dSw * theta_s
v_teorico = (a1 * v1_iso + a2 * v2_iso) / (a1 + a2)

print('=' * 52)
print(f'  v1_iso    = {v1_iso:.4e} m/s')
print(f'  v2_iso    = {v2_iso:.4e} m/s')
print(f'  v_teorico = {v_teorico:.4e} m/s')
print(f'  front crosses L in ~{L/v_teorico:.0f} s  (Tmax={Tmax:.0f}s)')
print('=' * 52)


# =============================================================================
# Operadores FE
# =============================================================================
wx = np.ones(Nx + 1); wx[0] = 0.5; wx[-1] = 0.5
wz = np.ones(Nz + 1); wz[0] = 0.5; wz[-1] = 0.5
w_area = np.outer(wz, wx) * dx * dz
M_phi  = phi_2d * w_area

wz_face = np.ones(Nz + 1); wz_face[0] = 0.5; wz_face[-1] = 0.5


def advection_upwind_x(q, u):
    """∂(u·q)/∂x con esquema upwind de primer orden (flujo u > 0)."""
    adv = np.zeros_like(q)
    adv[:, 1:-1] = (u[:, 1:-1] * q[:, 1:-1] - u[:, :-2] * q[:, :-2]) / dx
    return adv


def div_diffusion(S, D):
    """∇·(D ∇S) en 2D con promedio armónico en caras."""
    # eje x
    D_x   = 2.0 * D[:, 1:] * D[:, :-1] / (D[:, 1:] + D[:, :-1] + 1e-30)
    flux_x = D_x * (S[:, 1:] - S[:, :-1]) / dx
    div_x  = np.zeros_like(S)
    div_x[:, 1:-1] = (flux_x[:, 1:] - flux_x[:, :-1]) / dx
    # eje z
    D_z   = 2.0 * D[1:, :] * D[:-1, :] / (D[1:, :] + D[:-1, :] + 1e-30)
    flux_z = D_z * (S[1:, :] - S[:-1, :]) / dz
    div_z  = np.zeros_like(S)
    div_z[1:-1, :] = (flux_z[1:, :] - flux_z[:-1, :]) / dz
    return div_x + div_z


def apply_bcs(Sw_arr, nD_arr, C_arr, nD_inj):
    """Dirichlet en x=0, Neumann en x=L y bordes z."""
    Sw_arr[:, 0] = Sw_minus
    nD_arr[:, 0] = nD_inj
    C_arr[:, 0]  = C_inj

    Sw_arr[:, -1] = Sw_arr[:, -2]
    nD_arr[:, -1] = nD_arr[:, -2]
    C_arr[:, -1]  = C_arr[:, -2]

    for arr in (Sw_arr, nD_arr, C_arr):
        arr[0, :]  = arr[1, :]
        arr[-1, :] = arr[-2, :]


def get_front(Sw_2d, rows):
    """Posición media del frente (primera x donde Sw >= UMBRAL_FRENTE)."""
    pos = []
    for j in rows:
        row = Sw_2d[j, :]
        idx = np.where(row >= UMBRAL_FRENTE)[0]
        if len(idx) == 0:
            pos.append(float(x[-1]))
        else:
            i = int(idx[0])
            if i == 0:
                pos.append(float(x[0]))
            else:
                y0, y1 = row[i - 1], row[i]
                dy = y1 - y0
                xf = (x[i - 1] + (UMBRAL_FRENTE - y0) * (x[i] - x[i - 1]) / dy
                      if abs(dy) > 1e-12 else x[i])
                pos.append(float(np.clip(xf, 0.0, L)))
    return float(np.mean(pos)) if pos else 0.0

def get_front_nD(nD_2d, rows):
    """Posición media del frente de espuma (nD >= 0.5)."""
    pos = []
    umbral = 0.5
    for j in rows:
        row = nD_2d[j, :]
        idx = np.where(row >= umbral)[0]
        if len(idx) == 0:
            pos.append(float(x[-1]))
        else:
            i = int(idx[0])
            if i == 0:
                pos.append(float(x[0]))
            else:
                y0, y1 = row[i - 1], row[i]
                dy = y1 - y0
                xf = (x[i - 1] + (umbral - y0) * (x[i] - x[i - 1]) / dy
                      if abs(dy) > 1e-12 else x[i])
                pos.append(float(np.clip(xf, 0.0, L)))
    return float(np.mean(pos)) if pos else 0.0


# =============================================================================
# Control interactivo
# =============================================================================
estado_sim = {'pausado': False, 'salir': False, 'handler_registrado': False}

def on_key_press(event):
    key = (event.key or '').lower()
    if key == 'p':
        estado_sim['pausado'] = not estado_sim['pausado']
        print('PAUSE' if estado_sim['pausado'] else 'RESUME')
    elif key == 'q':
        estado_sim['salir'] = True
        print('EXIT requested (q).')


norm_Sw = Normalize(vmin=Sw_minus - 0.01, vmax=Sw_plus + 0.01)
norm_nD = Normalize(vmin=0.0, vmax=1.0)
norm_C  = Normalize(vmin=0.0, vmax=1.0)


def mostrar_frame(Sw_arr, nD_arr, C_arr, t,
                  hist_t, hist_fp1, hist_fp2, hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct):
    """Figura 2×4."""
    if USAR_CLEAR_OUTPUT:
        clear_output(wait=True)

    if MODO_INTERACTIVO:
        fig = plt.figure(num='FE 2D – nD corregido', figsize=(18, 14))
        fig.clf()
        axes = fig.subplots(3, 3)
        if not estado_sim['handler_registrado']:
            fig.canvas.mpl_connect('key_press_event', on_key_press)
            estado_sim['handler_registrado'] = True
    else:
        fig, axes = plt.subplots(3, 3, figsize=(18, 14))

    fig.suptitle(
        f't = {t:.0f} s  ({100*t/Tmax:.0f}%) | '
        f'ND_MODE={ND_MODE!r}',
        fontsize=11, fontweight='bold',
    )

    kw_img = dict(origin='lower', aspect='auto',
                  extent=[0, L, -d, d], interpolation='bilinear')

    # Encontrar la celda representativa basada en los controladores globales Z_EXTRACT
    # Nz=50. Capa 2: índices 0 a 25. Capa 1: índices 25 a 50. (Interfaz en 25)
    _idx_1 = int(25 + Z_EXTRACT_L1 * 25)
    _idx_2 = int(25 - Z_EXTRACT_L2 * 25)
    idx_L1_mid = np.clip(_idx_1, 25, Nz)
    idx_L2_mid = np.clip(_idx_2, 0, 25)

    # Panel [0,0] – Saturación Sw
    ax = axes[0, 0]
    im = ax.imshow(Sw_arr, cmap='RdYlBu_r', norm=norm_Sw, **kw_img)
    ax.axhline(0, color='white', lw=1.5, ls='--', alpha=0.8)
    
    # Dibujar líneas guía marcando la representación geométrica de extracción
    ax.axhline(z[idx_L1_mid], color='blue', lw=1.5, ls=':', alpha=0.9, label=f'L1 = {Z_EXTRACT_L1*100:.0f}%')
    ax.axhline(z[idx_L2_mid], color='green', lw=1.5, ls=':', alpha=0.9, label=f'L2 = {Z_EXTRACT_L2*100:.0f}%')
    ax.legend(fontsize=7, loc='lower right')

    ax.set_title(f'Saturación de agua  $S_w(x,z)$   [t={t:.0f} s]')
    ax.set_xlabel('x [m]'); ax.set_ylabel('z [m]')
    plt.colorbar(im, ax=ax, fraction=0.025, pad=0.02)

    # --- FILA 1: PERFILES Y POSICIÓN ---
    # Panel [1,0] – Perfiles 1D de Sw y nD
    ax_1d = axes[1, 0]
    
    # Extracción Representativa Óptima (Mitad geométrica de las capas)
    Sw_L1 = Sw_arr[idx_L1_mid, :]
    Sw_L2 = Sw_arr[idx_L2_mid, :]
    nD_L1 = nD_arr[idx_L1_mid, :]
    nD_L2 = nD_arr[idx_L2_mid, :]

    # Filtro Estilo Media Móvil (Moving Average) solicitado por el usuario
    # Planchan los ruidos de alta frecuencia emitiendo una curva continua sin dañar
    # las fronteras gracias a la compresión 'edge'.
    w_size = max(1, W_SIZE_1D)  # Tamaño de ventana amarrado al controlador global
    window = np.ones(w_size) / w_size
    
    def aplicar_media_movil(array_1d):
        num_arr = np.copy(array_1d).astype(float)
        pad_size = w_size
        padded = np.pad(num_arr, (pad_size, pad_size), mode='edge')
        smoothed_full = np.convolve(padded, window, mode='same')
        return smoothed_full[pad_size : pad_size + len(num_arr)]

    nD_L1_s = aplicar_media_movil(nD_L1)
    nD_L2_s = aplicar_media_movil(nD_L2)
    Sw_L1_s = aplicar_media_movil(Sw_L1)
    Sw_L2_s = aplicar_media_movil(Sw_L2)

    ax_1d.plot(x, Sw_L1_s, 'b-', lw=2, label=rf'$S_w$ L1 ({Z_EXTRACT_L1*100:.0f}%)')
    ax_1d.plot(x, Sw_L2_s, 'g-', lw=2, label=rf'$S_w$ L2 ({Z_EXTRACT_L2*100:.0f}%)')
    ax_1d.plot(x, nD_L1_s, 'b--', lw=1.5, label=rf'$n_D$ L1 ({Z_EXTRACT_L1*100:.0f}%)')
    ax_1d.plot(x, nD_L2_s, 'g--', lw=1.5, label=rf'$n_D$ L2 ({Z_EXTRACT_L2*100:.0f}%)')

    ax_1d.set_title(f'Perfiles 1D de $S_w$ y $n_D$ en capas   [t={t:.0f} s]')
    ax_1d.set_xlabel('x [m]')
    ax_1d.set_ylabel('Saturación / Textura')
    ax_1d.set_xlim(XMIN_1D, XMAX_1D)
    ax_1d.set_ylim(0, 1.05)
    ax_1d.legend(fontsize=8, loc='best')
    ax_1d.grid(alpha=0.3)

    # --- FILA 0 COLUMNA 1: MAPAS 2D CONTINUACIÓN ---
    # Panel [0,1] – Textura de espuma nD
    # Se superpone el contorno del frente de Sw para comparación visual directa.
    ax = axes[0, 1]
    im_nd = ax.imshow(nD_arr, cmap='plasma', norm=norm_nD, **kw_img)
    # Contorno del frente de Sw (línea donde Sw = UMBRAL_FRENTE)
    ax.contour(x, z, Sw_arr, levels=[UMBRAL_FRENTE],
               colors='cyan', linewidths=1.8, linestyles='--')
    ax.axhline(0, color='white', lw=1.5, ls='--', alpha=0.8)
    ax.set_title(
        f'Textura de espuma  $n_D(x,z)$\n'
        f'(línea cian = frente de $S_w$, modo={ND_MODE!r})'
    )
    ax.set_xlabel('x [m]'); ax.set_ylabel('z [m]')
    plt.colorbar(im_nd, ax=ax, fraction=0.025, pad=0.02)

    # Panel [1,1] – Posición del frente vs tiempo
    ax = axes[1, 1]
    t_line = np.array([0.0, Tmax])
    ax.plot(t_line, v_teorico * t_line, 'k--', lw=2,
            label=f'v_theory={v_teorico*1e5:.2f}e-5')
    ax.plot(t_line, v1_iso * t_line, 'b:', lw=1.5,
            label=f'val v1_iso (sin espuma)={v1_iso*1e5:.2f}e-5')
    ax.plot(t_line, v2_iso * t_line, 'g:', lw=1.5,
            label=f'val v2_iso (sin espuma)={v2_iso*1e5:.2f}e-5')

    if len(hist_t) > 5:
        t_arr = np.array(hist_t)
        ax.plot(t_arr, np.array(hist_fp1), color='steelblue',
                lw=2.5, label='front layer1')
        ax.plot(t_arr, np.array(hist_fp2), color='seagreen',
                lw=2.5, label='front layer2')
        n_win = min(60, len(t_arr) // 3)
        if n_win > 3:
            v1n = np.polyfit(t_arr[-n_win:], np.array(hist_fp1[-n_win:]), 1)[0]
            v2n = np.polyfit(t_arr[-n_win:], np.array(hist_fp2[-n_win:]), 1)[0]
            ax.set_title(
                f'Frente vs tiempo\n'
                f'v1_num={v1n*1e5:.2f}  v2_num={v2n*1e5:.2f}  [×10⁻⁵ m/s]',
                fontsize=9,
            )
        else:
            ax.set_title('Posición del frente vs tiempo')
    else:
        ax.set_title('Posición del frente vs tiempo')

    ax.set_xlim(0, Tmax); ax.set_ylim(0, L)
    ax.set_xlabel('t [s]'); ax.set_ylabel('frente x [m]')
    ax.legend(fontsize=8, loc='upper left'); ax.grid(alpha=0.3)

    # Panel [1,2] – Velocidad del frente vs Posición
    ax_v = axes[1, 2]
    idx_bt_global = len(hist_t)
    if len(hist_t) > 1:
        t_arr = np.array(hist_t)
        fp1_arr = np.array(hist_fp1)
        fp2_arr = np.array(hist_fp2)
        
        vt1 = np.gradient(fp1_arr, t_arr)
        vt2 = np.gradient(fp2_arr, t_arr)
        
        # Detectar el breakthrough natural
        idx_bt1 = np.argmax(fp1_arr >= L - 0.01)
        if idx_bt1 == 0 and fp1_arr[0] < L - 0.01: idx_bt1 = len(fp1_arr)
        idx_bt2 = np.argmax(fp2_arr >= L - 0.01)
        if idx_bt2 == 0 and fp2_arr[0] < L - 0.01: idx_bt2 = len(fp2_arr)
        idx_bt_global = min(idx_bt1, idx_bt2)

        # Suavizado con mode='valid'
        w_size = min(30, len(vt1))
        # Calculamos velocidad del frente de espuma nD
        fp1_nD_arr = np.array(hist_fp1_nD)
        fp2_nD_arr = np.array(hist_fp2_nD)
        vt1_nD = np.gradient(fp1_nD_arr, t_arr)
        vt2_nD = np.gradient(fp2_nD_arr, t_arr)
        
        if w_size > 2:
            window = np.ones(w_size) / w_size
            vt1 = np.convolve(vt1, window, mode='valid')
            vt2 = np.convolve(vt2, window, mode='valid')
            vt1_nD = np.convolve(vt1_nD, window, mode='valid')
            vt2_nD = np.convolve(vt2_nD, window, mode='valid')
            offset = w_size // 2
            
            # Cortar datos a partir de cuando la ventana de convolución alcanza el breakthrough
            c1 = max(0, idx_bt1 - w_size)
            c2 = max(0, idx_bt2 - w_size)
            
            fp1_plot = fp1_arr[offset : offset + len(vt1)][:c1]
            vt1 = vt1[:c1]
            vt1_nD = vt1_nD[:c1]
            
            fp2_plot = fp2_arr[offset : offset + len(vt2)][:c2]
            vt2 = vt2[:c2]
            vt2_nD = vt2_nD[:c2]
        else:
            fp1_plot = fp1_arr[:idx_bt1]
            vt1 = vt1[:idx_bt1]
            vt1_nD = vt1_nD[:idx_bt1]
            
            fp2_plot = fp2_arr[:idx_bt2]
            vt2 = vt2[:idx_bt2]
            vt2_nD = vt2_nD[:idx_bt2]

        if len(vt1) > 0:
            ax_v.plot(fp1_plot, vt1, color='steelblue', lw=2)
            ax_v.plot(fp1_plot, vt1_nD, color='purple', lw=2, ls='--', alpha=0.8)
        if len(vt2) > 0:
            ax_v.plot(fp2_plot, vt2, color='seagreen', lw=2)
            ax_v.plot(fp2_plot, vt2_nD, color='magenta', lw=2, ls='--', alpha=0.8)
            
        v_max1 = np.max(vt1) if len(vt1) > 0 else 0.0
        v_max2 = np.max(vt2) if len(vt2) > 0 else 0.0
        ymax_v = max(v_max1, v_max2, v_teorico, v1_iso, v2_iso)
    else:
        ymax_v = max(v_teorico, v1_iso, v2_iso)
        
    ax_v.axhline(v1_iso, color='b', ls=':', lw=1.5, alpha=0.5, label=f'$v_1$ teoría: {v1_iso:.2e}')
    ax_v.axhline(v2_iso, color='g', ls=':', lw=1.5, alpha=0.5, label=f'$v_2$ teoría: {v2_iso:.2e}')
    ax_v.axhline(v_teorico, color='k', ls='--', lw=2, alpha=0.8, label=f'$v$ global: {v_teorico:.2e}')
    
    ax_v.set_title('Velocidad del frente vs Posición')
    ax_v.set_xlabel('Posición del frente x [m]')
    ax_v.set_ylabel('Velocidad [m/s]')
    ax_v.set_xlim(0, L)
    ax_v.set_ylim(0, ymax_v * 1.5 if ymax_v > 0 else 1e-4)
    ax_v.legend(fontsize=8, loc='upper right')
    ax_v.grid(alpha=0.3)

    # --- FILA 2: MÉTRICAS DERIVADAS ---
    # Panel [2,1] - Transferencia de masa entre capas
    ax_trans = axes[2, 1]
    if len(hist_t) > 0 and len(hist_trans_z) > 0:
        # Graficamos hasta el breakthrough global
        t_trans = np.array(hist_t)[:idx_bt_global]
        z_trans = np.array(hist_trans_z)[:idx_bt_global]
        ax_trans.plot(t_trans, z_trans, color='purple', lw=1.8, label='Transferencia Z')
        if len(t_trans) > 0:
            ax_trans.set_xlim(0, max(t_trans[-1] * 1.1, 10.0))
        else:
            ax_trans.set_xlim(0, Tmax)
    else:
        ax_trans.set_xlim(0, Tmax)
        
    ax_trans.set_title('Transferencia cruzada (hasta Breakthrough)')
    ax_trans.set_xlabel('t [s]')
    ax_trans.set_ylabel('Flujo volumétrico')
    ax_trans.legend(fontsize=8, loc='upper left')
    ax_trans.grid(alpha=0.3)

    # Panel [2,0] - Distancia entre frentes
    ax_dist = axes[2, 0]
    if len(hist_t) > 0:
        dist_arr = np.abs(np.array(hist_fp1) - np.array(hist_fp2))
        ax_dist.plot(hist_t, dist_arr, color='crimson', lw=2)
        ax_dist.set_xlim(0, Tmax)
        ax_dist.set_ylim(0, max(np.max(dist_arr)*1.1, 0.01))
    ax_dist.set_title(r'Distancia entre frentes $|\Delta x|$')
    ax_dist.set_xlabel('t [s]')
    ax_dist.set_ylabel(r'$\Delta x$ [m]')
    ax_dist.grid(alpha=0.3)
    
    # Panel [2,2] - Perfiles de Presión
    ax_p = axes[2, 2]
    
    # Cálculo de movilidad total y gradiente de presión
    lt1 = lambda_t(Sw_L1, nD_L1, k1)
    lt2 = lambda_t(Sw_L2, nD_L2, k2)
    
    # Integración del gradiente de presión asumiendo P(L) = 0 bar (Gauge)
    # factor 1e-5 para convertir de Pascales a bar
    dpdx1 = u1 / (lt1 + 1e-30)
    P_L1 = np.cumsum(dpdx1[::-1])[::-1] * dx * 1e-5
    
    dpdx2 = u2 / (lt2 + 1e-30)
    P_L2 = np.cumsum(dpdx2[::-1])[::-1] * dx * 1e-5
    
    ax_p.plot(x, P_L1, color='blue', lw=2, label='Capa 1')
    ax_p.plot(x, P_L2, color='green', lw=2, label='Capa 2')
    ax_p.set_xlim(0+0.02, L-0.02)
    ax_p.set_ylim(0, max(np.max(P_L1), np.max(P_L2))*1.1 + 0.01)
    ax_p.set_title('Presión $P(x)$ en bar')
    ax_p.set_xlabel('x [m]')
    ax_p.set_ylabel('Presión [bar]')
    ax_p.legend(fontsize=8, loc='upper right')
    ax_p.grid(alpha=0.3)

    # Panel [0,2] - Velocidad Vertical $u_z$ (Solo cruzada en z=0 por capilaridad)
    ax_uz = axes[0, 2]
    uz_arr = np.zeros_like(Sw_arr)
    # Flujo capilar cruza en interfaz (índice 25)
    Dc_arr = np.clip(D_cap(Sw_arr, nD_arr, k_2d, phi_2d), 0.0, None)
    Dc_z_int = 2.0 * Dc_arr[26, :] * Dc_arr[25, :] / (Dc_arr[26, :] + Dc_arr[25, :] + 1e-30)
    uz_cross = Dc_z_int * (Sw_arr[25, :] - Sw_arr[26, :]) / dz
    
    # Representado puramente en la interfaz física
    uz_arr[25, :] = uz_cross
    
    # Fijar rango simétrico de mapa de color para que el CERO quede en blanco perfecto
    vmax_uz = max(float(np.max(np.abs(uz_cross))), 1e-12)
    im_uz = ax_uz.imshow(uz_arr, cmap='coolwarm', origin='lower', aspect='auto', extent=[0, L, -d, d], vmin=-vmax_uz, vmax=vmax_uz)
    ax_uz.axhline(0, color='k', lw=1.0, ls='--', alpha=0.3)
    ax_uz.set_title(r'V. Vertical (crossflow) $u_z$ [m/s]')
    ax_uz.set_xlabel('x [m]')
    ax_uz.set_ylabel('z [m]')
    
    # Zoom microscópico en la zona de interfaz pedida por el usuario
    eps_z = d * 0.1
    ax_uz.set_ylim(-eps_z, eps_z)
    plt.colorbar(im_uz, ax=ax_uz, fraction=0.025, pad=0.02)
    
    # --- Flechas indicando dirección de flujo ANTES y DESPUÉS del frente ---
    x_front = (hist_fp1[-1] + hist_fp2[-1]) / 2.0 if len(hist_fp1) > 0 else 0.0
    thresh = vmax_uz * 0.05
    
    # 1. Flecha ANTES del frente (anclada físicamente al pico capilar de flujo en la reserva descubierta)
    idx_antes = np.where(x[:-1] < x_front)[0]
    if len(idx_antes) > 0:
        uz_antes = uz_cross[idx_antes]
        if len(uz_antes) > 0 and not np.isnan(np.max(np.abs(uz_antes))) and np.max(np.abs(uz_antes)) > thresh:
            idx_max_a = idx_antes[np.argmax(np.abs(uz_antes))]
            mag_a = uz_cross[idx_max_a]
            norm_a = mag_a / (vmax_uz + 1e-30)
            ax_uz.quiver(x[idx_max_a], 0, 0, norm_a, color='k', scale=4, 
                         width=0.008, headwidth=5, headlength=6, pivot='mid')

    # 2. Flecha DESPUÉS del frente (anclada al pico de difusión en la fase virgen pionera)
    idx_despues = np.where(x[:-1] > x_front)[0]
    if len(idx_despues) > 0:
        uz_despues = uz_cross[idx_despues]
        if len(uz_despues) > 0 and not np.isnan(np.max(np.abs(uz_despues))) and np.max(np.abs(uz_despues)) > thresh:
            idx_max_d = idx_despues[np.argmax(np.abs(uz_despues))]
            mag_d = uz_cross[idx_max_d]
            norm_d = mag_d / (vmax_uz + 1e-30)
            ax_uz.quiver(x[idx_max_d], 0, 0, norm_d, color='k', scale=4, 
                         width=0.008, headwidth=5, headlength=6, pivot='mid')
                       
    ax_uz.axvline(x_front, color='green', ls='-.', lw=2, alpha=0.8, label='$x_{frente}$')
    ax_uz.legend(fontsize=8, loc='upper right')
    
    K_P = (k1 / k2) / (phi1 / phi2)
    fig.suptitle(f'Simulación 2D Elementos Finitos FOAM   |   $(k_1/k_2) / (\\phi_1/\\phi_2) = K/P = {K_P:.3f}$', fontsize=16, fontweight='bold')

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    if MODO_INTERACTIVO:
        plt.show(block=False); plt.pause(0.001)
    else:
        plt.show()


# =============================================================================
# Inicialización
# =============================================================================
Sw = np.full((Nz + 1, Nx + 1), Sw_plus)

# ── CORRECCIÓN CLAVE ──────────────────────────────────────────────────────────
# En el modo 'local_eq', nD se inicializa directamente como nD_LE(Sw),
# garantizando que el campo de espuma esté en equilibrio con la saturación
# desde el primer instante. No hay retraso cinético.
if ND_MODE == 'local_eq':
    nD = nD_LE(Sw)
else:
    nD = nD_LE(Sw)          # mismo inicio; la diferencia está en el bucle
# ─────────────────────────────────────────────────────────────────────────────

C = np.full((Nz + 1, Nx + 1), C_ini)

nD_inj = float(nD_LE(np.array([Sw_minus]))[0])
apply_bcs(Sw, nD, C, nD_inj)

hist_t       = []
hist_fp1     = []
hist_fp2     = []
hist_fp1_nD  = []
hist_fp2_nD  = []
hist_loss_pct = []
hist_rec_pct  = []
hist_trans_z  = []

mass_in             = 0.0
mass_out            = 0.0
mass_reactive_loss  = 0.0

print(f'Sw in [{Sw.min():.3f}, {Sw.max():.3f}]')
print(f'nD in [{nD.min():.3f}, {nD.max():.3f}]')
print(f'C  in [{C.min():.3f}, {C.max():.3f}]')
print(f'Nt={Nt}  dt={dt:.4f}s')
print('Starting – frame every 200 steps')
if (not SIN_GRAFICAS) and MODO_INTERACTIVO:
    print('Controls: p = pause/resume | q = quit')

t0 = time.time()

# =============================================================================
# Bucle principal
# =============================================================================
for step in range(1, Nt + 1):
    if estado_sim['salir']:
        break
    if (not SIN_GRAFICAS) and MODO_INTERACTIVO:
        while estado_sim['pausado'] and not estado_sim['salir']:
            plt.pause(0.1)
        if estado_sim['salir']:
            break

    t  = step * dt
    Sg = 1.0 - Sw
    Fw = fw(Sw, nD, k_2d)
    Fg = 1.0 - Fw
    Dc = np.clip(D_cap(Sw, nD, k_2d, phi_2d), 0.0, None)

    # ── Ecuación de Sw (sin cambios) ─────────────────────────────────────────
    adv_Sw  = advection_upwind_x(Fw, u_2d)
    diff_Sw = div_diffusion(Sw, Dc)
    rhs_Sw  = (-adv_Sw + diff_Sw) * w_area
    Sw_new  = Sw + dt * rhs_Sw / (M_phi + 1e-30)

    # ── Ecuación de nD – CORREGIDA ───────────────────────────────────────────
    if ND_MODE == 'local_eq':
        # OPCIÓN 1 (RECOMENDADA): equilibrio local instantáneo.
        # nD sigue exactamente a Sw en cada celda; los frentes coinciden
        # por construcción sin ningún retraso ni desajuste.
        nD_new = nD_LE(Sw_new)

    else:
        # OPCIÓN 2: transporte cinético con velocidad corregida.
        #
        # PROBLEMA ORIGINAL: se advectaba Fg*nD con u_2d, lo que mueve nD
        # a la velocidad del GAS, mucho más rápida/lenta que el frente de Sw.
        #
        # CORRECCIÓN: nD se advecta con la velocidad TOTAL del fluido
        # (u_2d / phi_2d), idéntica a la del frente de saturación.
        # La cinética Phi_foam acerca nD a su valor de equilibrio local.
        #
        #   ∂(φ nD)/∂t + ∂(u_total · nD)/∂x = φ · Φ_foam(Sw, nD)
        #
        # En forma discreta upwind:
        u_total_nD = u_2d * nD          # velocidad total × concentración
        adv_nD_corr = advection_upwind_x(nD, u_2d)  # ∂(u nD)/∂x

        # Fuente cinética: lleva nD → nD_LE(Sw), con difusión estabilizadora.
        src_nD = Phi_foam(Sw, nD)
        dif_nD = eps_nD * div_diffusion(nD, np.ones_like(nD))

        rhs_nD = (-adv_nD_corr + src_nD + dif_nD) * w_area
        M_nD   = phi_2d * w_area          # masa: φ (sin Sg para que el frente
                                          # coincida con el de Sw)
        nD_new = nD + dt * rhs_nD / (M_nD + 1e-30)

    # ── Especie C (opcional) ─────────────────────────────────────────────────
    uw = u_2d * Fw
    if CONSIDERAR_C:
        adv_C        = advection_upwind_x(C, uw)
        diff_C       = D_c * div_diffusion(C, np.ones_like(C))
        k_ads_eff    = k_ads0 * np.clip(1.0 - beta_foam_ads * nD, 0.05, 1.0)
        sink_C       = (k_ads_eff + k_deg) * C
        rhs_C        = (-adv_C + diff_C - sink_C) * w_area
        M_C          = phi_2d * np.clip(Sw, 1e-6, 1.0) * w_area
        C_new        = C + dt * rhs_C / (M_C + 1e-30)
    else:
        sink_C = np.zeros_like(C)
        C_new  = C

    # ── Clip y condiciones de frontera ───────────────────────────────────────
    Sw_new = np.clip(Sw_new, Swc + 1e-6, 1 - Sgr - 1e-6)
    nD_new = np.clip(nD_new, 0.0, 1.0)
    C_new  = np.clip(C_new,  0.0, 1.0)
    apply_bcs(Sw_new, nD_new, C_new, nD_inj)

    # ── Transferencia cruzada (Cross-flow en z=0) ────────────────────────────
    # Para Nz=50, índice 25 -> z=0. Flujo ascendente (Capa 2 -> Capa 1).
    Dc_z_int = 2.0 * Dc[26, :] * Dc[25, :] / (Dc[26, :] + Dc[25, :] + 1e-30)
    q_cross = float(np.sum(Dc_z_int * (Sw[25, :] - Sw[26, :]) / dz * dx))

    # ── Eficiencia de Barrido Volumétrico ────────────
    # Proporción del área física contactada por el frente inyectado
    area_barrida = float(np.sum(Sw_new > (Sw_minus + 0.01)) * dx * dz)
    area_total   = float(L * 2 * d)
    rec_pct      = 100.0 * area_barrida / area_total

    if CONSIDERAR_C:
        inj_flux = uw[:, 0] * C_inj
        out_flux = np.clip(uw[:, -1], 0.0, None) * C_new[:, -1]
        mass_in            += float(np.sum(inj_flux * wz_face) * dz * dt)
        mass_out           += float(np.sum(out_flux * wz_face) * dz * dt)
        reactive_loss_rate  = sink_C * phi_2d * np.clip(Sw, 1e-6, 1.0)
        mass_reactive_loss += float(np.sum(reactive_loss_rate * w_area) * dt)
        loss_pct = 100.0 * mass_reactive_loss / max(mass_in, 1e-12)
    else:
        loss_pct = 0.0

    Sw = Sw_new
    nD = nD_new
    C  = C_new

    # ── Historial y visualización ─────────────────────────────────────────────
    if step % 10 == 0:
        hist_t.append(t)
        hist_fp1.append(get_front(Sw, rows1))
        hist_fp2.append(get_front(Sw, rows2))
        hist_fp1_nD.append(get_front_nD(nD, rows1))
        hist_fp2_nD.append(get_front_nD(nD, rows2))
        hist_loss_pct.append(loss_pct)
        hist_rec_pct.append(rec_pct)
        hist_trans_z.append(q_cross)

    if (not SIN_GRAFICAS) and (step % 200 == 0):
        mostrar_frame(Sw, nD, C, t,
                      hist_t, hist_fp1, hist_fp2, hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct)

# =============================================================================
# Frame final y reporte
# =============================================================================
if not SIN_GRAFICAS:
    t_final   = step * dt if step <= Nt else Tmax
    final_loss = 100.0 * mass_reactive_loss / max(mass_in, 1e-12)
    final_rec  = rec_pct
    mostrar_frame(Sw, nD, C, t_final,
                  hist_t, hist_fp1, hist_fp2, hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct)

if (not SIN_GRAFICAS) and MODO_INTERACTIVO:
    plt.ioff(); plt.show()

final_loss = 100.0 * mass_reactive_loss / max(mass_in, 1e-12)
final_rec  = rec_pct
K_P = (k1 / k2) / (phi1 / phi2)
print(f'Mass in         = {mass_in:.4e}')
print(f'Mass out        = {mass_out:.4e}')
print(f'Mass react loss = {mass_reactive_loss:.4e}')
print(f'Loss percent    = {final_loss:.2f}%')
print(f'Recovery percent= {final_rec:.2f}%')
print(f'K/P             = {K_P:.4f}')
print(f'Completed in {(time.time()-t0)/60:.1f} min')