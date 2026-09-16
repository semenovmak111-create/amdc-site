# -*- coding: utf-8 -*-
"""Белый мрамор для фона разворота «Технология».

Чужой файл не берётся, текстура собирается здесь — тем же
приёмом, что и mag-bg.jpg, только вывернутым в светлое.

Разбор референса (белый каррарский мрамор, фотография):
  * поле почти чистое, серого в нём меньше четверти площади;
  * прожилки идут не сеткой, а гроздьями: полоса густых линий,
    потом ладонь чистого камня, потом снова полоса;
  * у каждой тёмной линии есть серый ореол вдвое-втрое шире
    её самой — без него линия читается трещиной, а не жилой;
  * толщина внутри одной жилы гуляет: то волос, то палец.

Отсюда и сборка:
  clouds  — крупный шум, серые разводы;
  mask    — ещё более крупный шум, продавленный порогом: он
            решает, где жилы есть, а где чистое поле;
  veins   — |sin| от координаты, продавленной шумом. Линия
            идёт по нулям синуса, шум её гнёт и ветвит.
            Степень синуса делает линию тонкой, и сама степень
            тоже шумит — отсюда гуляющая толщина;
  ореол   — та же жила в малой степени и малой силе.
"""
import numpy as np
from PIL import Image

W, H = 1700, 1800
rng = np.random.default_rng(20260917)


def noise(cells):
    """Гладкий шум: сетка случайных чисел, растянутая бикубикой."""
    cy = max(2, int(round(cells * H / max(W, H))))
    cx = max(2, int(round(cells * W / max(W, H))))
    g = (rng.random((cy + 1, cx + 1)) * 255).astype(np.uint8)
    im = Image.fromarray(g).resize((W, H), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0


def fbm(cells, octaves):
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    for i in range(octaves):
        out += amp * noise(cells * (2 ** i))
        tot += amp
        amp *= 0.5
    return out / tot


X, Y = np.meshgrid(np.linspace(0, 1, W, dtype=np.float32),
                   np.linspace(0, 1, H, dtype=np.float32))


def ridge(angle, freq, warp, power, seed):
    a = np.deg2rad(angle)
    u = (X * np.cos(a) + Y * np.sin(a)) * freq + seed * warp
    return 1.0 - np.abs(np.sin(np.pi * u))


def vein(angle, freq, warp, power, seed, jitter):
    """Жила: тонкое ядро плюс широкий серый ореол."""
    r = ridge(angle, freq, warp, power, seed)
    p = power * (0.55 + 0.9 * jitter)          # толщина гуляет
    core = r ** p
    halo = r ** (power * 0.16)
    return core, halo


def smooth(v, lo, hi):
    t = np.clip((v - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def crease(cells, octaves):
    """Складчатый шум: |2f-1| даёт острые гребни, а не плавные
    холмы. Жила, согнутая по такому полю, ломается под углом —
    как на камне, — а не сворачивается в дым."""
    return 1.0 - np.abs(2.0 * fbm(cells, octaves) - 1.0)


w1, w2, w3, w4 = crease(3, 4), crease(4, 4), crease(6, 3), crease(3, 4)
jit1, jit2 = fbm(6, 3), fbm(9, 3)
clouds = fbm(3, 4)

# Где жилы гуще, где чище. Маска резкая: на плите должны быть
# ладони чистого камня, иначе рисунок читается тканью.
mask_a = 0.10 + 0.90 * smooth(fbm(2, 3), 0.38, 0.68)
mask_b = 0.10 + 0.90 * smooth(fbm(2, 3), 0.36, 0.66)
mask_m = 0.15 + 0.85 * smooth(fbm(3, 3), 0.38, 0.72)

# Два русла под разными углами: одно направление на всю плиту
# даёт полосатую ткань, два пересекаются и дают камень.
c_a, h_a = vein(-36, 1.6, 0.9, 12.0, w1, jit1)
c_b, h_b = vein(12, 1.3, 0.8, 13.0, w4, jit2)
c_mid, h_mid = vein(-25, 3.4, 1.3, 17.0, w2, jit2)
# Волосяная штриховка вдоль крупных жил. Сдвиг обязан расти
# вместе с частотой: при малом сдвиге и частоте в двадцать
# линия выходит линейкой, а не волосом на камне. Третьего,
# самого мелкого набора жил тут нет: с ним плита читалась
# горизонталями топографической карты, а не камнем.
c_hair = ridge(-36, 7.5, 3.0, 0, w2) ** 30.0

lum = np.full((H, W), 0.988, np.float32)
lum -= smooth(clouds, 0.26, 0.92) * 0.11            # разводы
lum -= h_a * mask_a * 0.13                           # ореолы
lum -= h_b * mask_b * 0.10
lum -= h_mid * mask_m * 0.06
lum -= c_a * mask_a * 0.78
lum -= c_b * mask_b * 0.62
lum -= c_mid * mask_m * 0.30
lum -= c_hair * mask_a * 0.06
lum = np.clip(lum, 0.0, 1.0)

# Мрамор не серый в ноль: тени уходят в холодный синевато-серый,
# света — в тёплый белый. Разводим каналы на полтора процента.
r = lum * 1.000
g = lum * 0.998 + 0.004
b = lum * 0.996 + 0.010

rgb = np.stack([r, g, b], axis=2) * 255.0
rgb += rng.normal(0.0, 1.5, rgb.shape)
img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
img.save("assets/img/marble.jpg", quality=84, optimize=True, progressive=True)

a = np.asarray(img.convert("L"), dtype=np.float32)
print("mean %.0f  std %.0f  min %.0f  max %.0f  доля темнее 200: %.0f%%"
      % (a.mean(), a.std(), a.min(), a.max(), (a < 200).mean() * 100))
