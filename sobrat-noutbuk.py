# -*- coding: utf-8 -*-
"""Собрать картинку ноутбука для второй выгоды.

Ноутбук на странице — не рисунок разметкой, а готовый 3D-макет с
вписанным в него снимком первого экрана. Макет — MacBook Air M1 из
сборки w2sv/pythonMockup (MIT), у него экран залит хромакеем; сюда
этот хромакей находится, снимок вписывается в его четырёхугольник
перспективным преобразованием, сверху кладётся мягкое отражение
окна, и всё сохраняется одним файлом.

    python sobrat-noutbuk.py

Читает assets/shots/pervyy-ekran.webp, пишет
assets/img/macbook-air-m1.webp. Исходный макет скачивается с
GitHub при первом запуске и в репозиторий не кладётся.

Нужны Pillow и numpy.
"""

import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
MAKET_URL = ('https://raw.githubusercontent.com/w2sv/pythonMockup/HEAD/'
             'assets/mockup/macbook-air-m1-01.png')
MAKET = os.path.join(ROOT, 'assets', 'img', '.maket-macbook-air-m1.png')
SNIMOK = os.path.join(ROOT, 'assets', 'shots', 'pervyy-ekran.webp')
VYVOD = os.path.join(ROOT, 'assets', 'img', 'macbook-air-m1.webp')
SHIRINA = 1400


def skachat_maket():
    if os.path.exists(MAKET):
        return
    print('качаю макет:', MAKET_URL)
    os.makedirs(os.path.dirname(MAKET), exist_ok=True)
    urllib.request.urlretrieve(MAKET_URL, MAKET)


def hromakey(im):
    """Две маски: строгая — чистая зелень, мягкая — вся её кромка.

    Строгой вставляется снимок, мягкой гасится остаток: по краю
    экрана лежат полупрозрачные зелёные пиксели, и если их не
    затемнить заранее, вокруг снимка остаётся зелёная нитка.
    """
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    strogaya = (g > 120) & (g - r > 60) & (g - b > 60)
    myagkaya = (g - np.maximum(r, b)) > 10
    return strogaya, myagkaya


def ugly(maska):
    """Четыре угла четырёхугольника экрана."""
    ys, xs = np.nonzero(maska)
    p = np.stack([xs, ys], 1).astype(np.float64)
    s, d = p[:, 0] + p[:, 1], p[:, 0] - p[:, 1]
    return [p[np.argmin(s)], p[np.argmax(d)], p[np.argmax(s)], p[np.argmin(d)]]


def koefficienty(iz, v):
    """Коэффициенты PIL.PERSPECTIVE: они отображают выход во вход."""
    A, B = [], []
    for (sx, sy), (dx, dy) in zip(iz, v):
        A.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]); B.append(sx)
        A.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]); B.append(sy)
    return np.linalg.solve(np.asarray(A, np.float64), np.asarray(B, np.float64))


def sobrat():
    skachat_maket()
    maket = Image.open(MAKET).convert('RGBA')
    W, H = maket.size
    strogaya, myagkaya = hromakey(maket)
    uglovye = ugly(strogaya)
    print('углы экрана:', [tuple(np.round(u, 1)) for u in uglovye])

    # гасим зелень целиком, вместе с полупрозрачной кромкой
    piksely = np.asarray(maket).copy()
    piksely[myagkaya, 0:3] = (9, 7, 12)
    osnova = Image.fromarray(piksely, 'RGBA')

    snimok = Image.open(SNIMOK).convert('RGBA')
    sw, sh = snimok.size
    vpisan = snimok.transform(
        (W, H), Image.PERSPECTIVE,
        koefficienty([(0, 0), (sw, 0), (sw, sh), (0, sh)], uglovye),
        Image.BICUBIC)

    maska = Image.fromarray((strogaya * 255).astype(np.uint8), 'L')
    maska = maska.filter(ImageFilter.GaussianBlur(0.7))
    osnova.paste(vpisan, (0, 0), maska)

    # отражение окна: широкая мягкая полоса от левого верхнего угла
    bl = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(bl)
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = [tuple(u) for u in uglovye]
    d.polygon([(x0, y0),
               (x0 + (x1 - x0) * .44, y0 + (y1 - y0) * .44),
               (x3 + (x2 - x3) * .11, y3 + (y2 - y3) * .11),
               (x3, y3)], fill=24)
    bl = bl.filter(ImageFilter.GaussianBlur(W / 70.0))
    bl = Image.fromarray(
        (np.asarray(bl).astype(np.float32) * (np.asarray(maska) / 255.0)
         ).astype(np.uint8), 'L')
    belyy = Image.merge('RGBA', (Image.new('L', (W, H), 255),) * 3 + (bl,))
    gotovo = Image.alpha_composite(osnova, belyy)

    gotovo = gotovo.crop(gotovo.getchannel('A').getbbox())
    vys = round(gotovo.size[1] * SHIRINA / gotovo.size[0])
    gotovo = gotovo.resize((SHIRINA, vys), Image.LANCZOS)
    gotovo.save(VYVOD, 'WEBP', quality=90, method=6)
    print('готово:', VYVOD, gotovo.size, os.path.getsize(VYVOD), 'байт')


if __name__ == '__main__':
    sys.exit(sobrat())
