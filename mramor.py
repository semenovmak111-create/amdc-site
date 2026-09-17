# -*- coding: utf-8 -*-
"""Белый мрамор для фона разворота «Технология».

Заказчик потребовал две вещи: жилы должны быть резкими ломаными,
а не плавными разводами, и картинка должна быть резкой.

Первый заход собирал жилы из |sin| от координаты, продавленной
шумом. Приём дешёвый, но у него два врождённых порока: шум по
своей природе гладкий, поэтому линия всегда выходит кривой без
единого угла, и она же всегда размытая — у |sin| нет кромки,
есть только склон. Ни то ни другое числами не лечится.

Поэтому жилы теперь не считаются, а рисуются:

  * жила — случайное блуждание отрезками по 40–150 точек.
    Направление слегка плывёт, а с вероятностью в пятую часть
    ломается на 30–65 градусов разом. Это и есть «резкая
    ломаная»: у неё нет ни одной дуги, только прямые и углы;
  * от жилы отходят ветви, от ветвей — свои, до третьего
    колена, каждая тоньше и короче родителя;
  * рисуется всё в тройном разрешении и ужимается Ланцошем:
    кромка получает честное сглаживание в один-два пикселя,
    а не размывку в двадцать;
  * ореол — та же маска, размытая отдельным слоем. Отдельным
    обязательно: подмешай его к ядру, и ядро поплывёт.

Облака оставлены прежними — в камне они и должны быть мягкими,
резкие тут только жилы.

Размер 2560×2720 при полосе в 1900 точек шириной: картинка
работает с уменьшением, а не с растяжкой. Формат webp — на
чёрной нитке в один пиксель JPEG даёт звон по всей округе.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2560, 2720
SS = 3                       # надрисовка для сглаживания кромки
# Семя выбрано перебором: при нём обе текстовые зоны чистые
# (шапка 0.00 %, якоря 0.53 %), см. замер в конце файла.
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 3
rng = np.random.default_rng(SEED)


# ---------- мягкая подложка: облака ---------------------------
def noise(cells):
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


def smooth(v, lo, hi):
    t = np.clip((v - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ---------- жилы: ломаные, а не кривые ------------------------
big = Image.new("L", (W * SS, H * SS), 0)
fine = Image.new("L", (W * SS, H * SS), 0)
d_big, d_fine = ImageDraw.Draw(big), ImageDraw.Draw(fine)


trail = []                    # точки крупных жил: по ним селится сетка


def walk(x, y, ang, width, span, steps, depth, sink, remember):
    base = ang
    """Одна жила. Возвращает точки, где стоит отпустить ветвь."""
    pts = [(x, y)]
    forks = []
    for i in range(steps):
        # Длина отрезка задаётся мерой жилы, а не её толщиной:
        # у волоса шаг короткий, у крупной жилы длинный. Общая
        # длина для всех давала длинные прямые царапины поперёк
        # всей плиты, а вывод из толщины — жилы в треть плиты.
        step = rng.uniform(0.55, 1.7) * span
        ang += rng.normal(0.0, 0.16)                      # лёгкий снос
        if rng.random() < 0.22:                           # излом
            ang += np.sign(rng.normal()) * rng.uniform(0.52, 1.15)
        # Возврат к своему направлению. Без него за сорок шагов
        # жила забывает, откуда шла, и вся плита превращается в
        # чащу без единого направления — а на образце зерно
        # читается сразу: всё идёт снизу слева наверх направо.
        ang += (base - ang) * 0.30
        x += np.cos(ang) * step
        y += np.sin(ang) * step
        pts.append((x, y))
        if depth < 2 and rng.random() < 0.20:
            forks.append((x, y, ang, i))
        if not (-0.2 * W * SS < x < 1.2 * W * SS and
                -0.2 * H * SS < y < 1.2 * H * SS):
            break

    if remember:
        trail.extend(pts)

    # Полилиния режется на куски по три отрезка: у каждого своя
    # толщина, оттого жила то волос, то палец. Стык кусков общей
    # точкой, иначе на нём появляется разрыв.
    i = 0
    while i < len(pts) - 1:
        chunk = pts[i:i + 4]
        w = max(1, int(round(width * rng.uniform(0.55, 1.45))))
        sink.line(chunk, fill=255, width=w, joint="curve")
        i += 3
    return forks


def vein(x, y, ang, width, span, steps, sink, remember=False):
    stack = [(x, y, ang, width, span, steps, 0)]
    while stack:
        x, y, ang, width, span, steps, depth = stack.pop()
        if steps < 2 or width < 1:
            continue
        for fx, fy, fang, _ in walk(x, y, ang, width, span, steps, depth,
                                    sink, remember):
            stack.append((fx, fy, fang + np.sign(rng.normal()) *
                          rng.uniform(0.55, 1.25),
                          width * 0.55, span * 0.62,
                          int(steps * 0.5), depth + 1))


# ---------- раскладка по образцу ------------------------------
# На фотографии, которую дал заказчик, жилы не разбросаны как
# попало: у них есть главное направление — снизу слева наверх
# направо, — и вся плита им прошита насквозь. Поперёк идёт
# вторая, редкая семья. Отсюда и раскладка: угол берётся не
# случайный, а около главного, с разбросом в четверть радиана.
DOM = -0.62                      # главное направление, радианы
CROSS = 0.52                     # поперечная семья

wide = Image.new("L", (W * SS, H * SS), 0)
d_wide = ImageDraw.Draw(wide)

SPAN = 150 * SS / 2.2            # мера шага крупной жилы


def enter(k, n, ang, width, steps, sink, remember=False, left=False):
    """Точка входа с края, разложенная по стороне с дрожанием."""
    t = (k + rng.uniform(0.1, 0.9)) / n
    if left:
        vein(-30.0, t * H * SS, ang, width, SPAN, steps, sink, remember)
    else:
        vein((t * 1.8 - 0.45) * W * SS, H * SS + 30.0, ang, width,
             SPAN, steps, sink, remember)


# Широкие серые массы вдоль главного направления. Это не линии,
# а тень: на образце вдоль крупных жил идёт размытая тёмная
# кайма шириной в палец. Рисуются в свою маску, она размывается
# целиком.
for k in range(9):
    enter(k, 9, DOM + rng.normal(0, 0.14),
          rng.uniform(26, 54) * SS / 2.2, int(rng.integers(38, 62)), d_wide)

# Первый разряд: шесть главных жил через всю плиту. Они держат
# рисунок, всё остальное — их свита.
for k in range(6):
    enter(k, 6, DOM + rng.normal(0, 0.18),
          rng.uniform(12, 22) * SS / 2.2, int(rng.integers(44, 70)),
          d_big, remember=True)

# Второй разряд: те же направления, вдвое тоньше.
for k in range(20):
    enter(k, 20, DOM + rng.normal(0, 0.26),
          rng.uniform(3.0, 6.5) * SS / 2.2, int(rng.integers(38, 66)),
          d_big, remember=True)
for k in range(10):
    enter(k, 10, DOM + rng.normal(0, 0.26),
          rng.uniform(3.0, 6.5) * SS / 2.2, int(rng.integers(34, 60)),
          d_big, remember=True, left=True)

# Поперечная семья — реже и тоньше, она держит рисунок от
# превращения в штриховку.
for k in range(8):
    enter(k, 8, CROSS + rng.normal(0, 0.22),
          rng.uniform(1.8, 4.2) * SS / 2.2, int(rng.integers(34, 58)),
          d_big, remember=True, left=True)

# Волосяная сетка. На образце её очень много: между крупными
# жилами всё поле в мелкой ломаной крошке. Селится она по
# крупным жилам, поэтому и густеет там же, где они.
for _ in range(150):
    px, py = trail[int(rng.integers(0, len(trail)))]
    px += rng.normal(0, 70) * SS
    py += rng.normal(0, 70) * SS
    ang = (DOM if rng.random() < 0.55 else rng.uniform(0, 6.283))
    vein(px, py, ang + rng.normal(0, 0.55),
         rng.uniform(0.8, 1.7) * SS / 2.2,
         26 * SS / 2.2, int(rng.integers(3, 7)), d_fine)


def bring_down(im):
    return np.asarray(im.resize((W, H), Image.LANCZOS),
                      dtype=np.float32) / 255.0


core_big = bring_down(big)
core_fine = bring_down(fine)
# Широкие полосы размываются в массу: резкой у них должна быть
# не кромка, а соседняя с ними тонкая жила.
band = np.asarray(
    Image.fromarray((bring_down(wide) * 255).astype(np.uint8))
    .filter(ImageFilter.GaussianBlur(44)), dtype=np.float32) / 255.0
# Ореол считается от обеих масок сразу и размывается уже в
# конечном размере — размывать в тройном значит впустую сжечь
# втрое больше памяти.
halo_src = Image.fromarray(
    (np.clip(core_big + core_fine * 0.6, 0, 1) * 255).astype(np.uint8))
halo = np.asarray(halo_src.filter(ImageFilter.GaussianBlur(42)),
                  dtype=np.float32) / 255.0

clouds = fbm(3, 4)
patch = 0.15 + 0.85 * smooth(fbm(2, 3), 0.34, 0.68)   # где камень грязнее

lum = np.full((H, W), 0.988, np.float32)
lum -= smooth(clouds, 0.26, 0.92) * 0.09      # разводы
lum -= np.clip(band, 0, 1) * patch * 0.55     # серые полосы-массы
lum -= halo * patch * 0.70                    # ореол вокруг жил
lum -= np.clip(core_big, 0, 1) * 1.05         # ядро крупных жил
lum -= np.clip(core_fine, 0, 1) * 0.80        # волосяная сетка
lum = np.clip(lum, 0.0, 1.0)

# Мрамор не серый в ноль: тени уходят в холодный синевато-серый,
# света — в тёплый белый.
r = lum * 1.000
g = lum * 0.998 + 0.004
b = lum * 0.996 + 0.010

rgb = np.stack([r, g, b], axis=2) * 255.0
rgb += rng.normal(0.0, 1.2, rgb.shape)
img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
if len(sys.argv) > 2 and sys.argv[2] == "--проба":
    OUT = "/dev/null"
else:
    img.save("assets/img/marble.webp", quality=90, method=6)

a = np.asarray(img.convert("L"), dtype=np.float32)


def ink(x0, x1, y0, y1):
    """Доля тёмного в прямоугольнике, заданном долями стороны."""
    z = a[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
    return (z < 170).mean() * 100


# Две зоны, где на полосе стоит текст прямо по камню: шапка
# разворота и строка якорных цифр. Жила поперёк них читается
# зачёркиванием, поэтому семя выбирается по этим двум числам.
print("seed %d  mean %.0f  std %.0f  темнее 128: %.1f%%  "
      "шапка %.2f%%  якоря %.2f%%"
      % (SEED, a.mean(), a.std(), (a < 128).mean() * 100,
         ink(0.17, 0.40, 0.04, 0.15), ink(0.16, 0.43, 0.78, 0.87)))
