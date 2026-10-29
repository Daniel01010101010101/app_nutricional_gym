#!/usr/bin/env python3
"""
Genera src/data/seeds/foods.data.ts a partir de dos fuentes oficiales:

1. Tabla de Composición de Alimentos Colombianos (TCAC), ICBF 2018.
   Los valores (por 100 g de parte comestible) se transcribieron de la publicación
   https://www.icbf.gov.co/system/files/tcac_web.pdf y se indican con su código (p. ej. A006).
2. USDA FoodData Central, SR Legacy (abril 2018).
   Descarga: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
   Los valores se leen del CSV por FDC ID.

Uso:
    python3 scripts/build-food-seed.py <carpeta del CSV de SR Legacy>

Las medidas caseras son aproximaciones estándar (USDA y uso común en Colombia).
"""
import csv
import json
import os
import sys

NUTRIENTS = {'1008': 'kcal', '1003': 'protein', '1004': 'fat', '1005': 'carbs', '1079': 'fiber'}

# ───────────────────────── Plantillas por tipo de alimento ─────────────────────────
MEAT = dict(veg=False, vegan=False, lactose=False, gluten=False)
VEGAN = dict(veg=True, vegan=True, lactose=False, gluten=False)
OVO = dict(veg=True, vegan=False, lactose=False, gluten=False)
DAIRY = dict(veg=True, vegan=False, lactose=True, gluten=False)
WHEAT = dict(veg=True, vegan=False, lactose=False, gluten=True)
WHEAT_VEGAN = dict(veg=True, vegan=True, lactose=False, gluten=True)

MAIN = ['lunch', 'dinner']
ALL = ['breakfast', 'lunch', 'dinner', 'snack']
BS = ['breakfast', 'snack']


def icbf(code, kcal, protein, fat, carbs, fiber=0.0):
    return {'type': 'icbf', 'code': code, 'values': dict(kcal=kcal, protein=protein, fat=fat, carbs=carbs, fiber=fiber)}


def usda(fdc_id):
    return {'type': 'usda', 'fdc': str(fdc_id)}


def f(id, name, category, source, *, measures=(), roles=(), slots=(), diet=VEGAN, allergens=(), cost='low',
      section='despensa', purchase=None, cooked=None, step=None):
    return dict(id=id, name=name, category=category, source=source, measures=list(measures), roles=list(roles),
                slots=list(slots), diet=diet, allergens=list(allergens), cost=cost, section=section,
                purchase=purchase, cooked=cooked)


def m(label, grams):
    return (label, grams)


CRUDO = lambda y: {'yield': y, 'buyAs': 'crudo'}  # noqa: E731
SECO = lambda y: {'yield': y, 'buyAs': 'en seco'}  # noqa: E731

FOODS = [
    # ───────────── Aves ─────────────
    f('pechuga-pollo-asada', 'Pechuga de pollo asada, sin piel', 'poultry', usda(171477),
      measures=[m('1 filete mediano', 120), m('1 porción', 100)], roles=['protein'], slots=['lunch', 'dinner', 'snack'],
      diet=MEAT, section='carnes', cooked=CRUDO(0.75)),
    f('pechuga-pollo-sudada', 'Pechuga de pollo sudada o desmechada', 'poultry', usda(171478),
      measures=[m('1 taza desmechada', 140), m('1 porción', 100)], roles=['protein'], slots=['lunch', 'dinner', 'breakfast'],
      diet=MEAT, section='carnes', cooked=CRUDO(0.8)),
    f('muslo-pollo-asado', 'Muslo de pollo asado, sin piel', 'poultry', usda(172388),
      measures=[m('1 unidad', 70), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, section='carnes',
      cooked=CRUDO(0.7)),
    f('pernil-pollo-asado', 'Pernil (contramuslo) de pollo asado, sin piel', 'poultry', usda(172376),
      measures=[m('1 unidad', 60)], roles=['protein'], slots=MAIN, diet=MEAT, section='carnes', cooked=CRUDO(0.7)),
    f('alas-pollo-asadas', 'Alitas de pollo asadas, sin piel', 'poultry', usda(172392),
      measures=[m('1 unidad', 30)], diet=MEAT, section='carnes', cooked=CRUDO(0.7)),
    f('pechuga-pavo-asada', 'Pechuga de pavo asada', 'poultry', usda(174516),
      measures=[m('1 porción', 100), m('1 tajada', 30)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium',
      section='carnes', cooked=CRUDO(0.75)),
    # ───────────── Res y cerdo ─────────────
    f('res-bola-asada', 'Carne de res magra (bola o pierna) asada', 'meat', usda(170633),
      measures=[m('1 bistec mediano', 120), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium',
      section='carnes', cooked=CRUDO(0.72)),
    f('res-solomo-asado', 'Solomo de res asado, sin grasa visible', 'meat', usda(168634),
      measures=[m('1 bistec mediano', 120), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='high',
      section='carnes', cooked=CRUDO(0.72)),
    f('res-sobrebarriga', 'Sobrebarriga (falda) de res, magra, cocida', 'meat', usda(168610),
      measures=[m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium', section='carnes',
      cooked=CRUDO(0.7)),
    f('res-molida-90', 'Carne molida de res 90/10, cocida', 'meat', usda(171794),
      measures=[m('1 taza', 110), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium',
      section='carnes', cooked=CRUDO(0.75)),
    f('res-molida-95', 'Carne molida de res extra magra 95/5, cocida', 'meat', usda(174028),
      measures=[m('1 taza', 110), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium',
      section='carnes', cooked=CRUDO(0.75)),
    f('res-posta-sudada', 'Posta de res sudada (magra)', 'meat', usda(170615),
      measures=[m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium', section='carnes',
      cooked=CRUDO(0.7)),
    f('higado-res', 'Hígado de res frito', 'meat', usda(168627),
      measures=[m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, section='carnes', cooked=CRUDO(0.8)),
    f('lomo-cerdo-asado', 'Lomo de cerdo asado (magro)', 'meat', usda(168250),
      measures=[m('1 porción', 100), m('1 medallón', 60)], roles=['protein'], slots=MAIN, diet=MEAT, cost='medium',
      section='carnes', cooked=CRUDO(0.75)),
    f('chuleta-cerdo', 'Chuleta de cerdo magra a la plancha', 'meat', usda(168285),
      measures=[m('1 unidad', 120)], roles=['protein'], slots=MAIN, diet=MEAT, section='carnes', cooked=CRUDO(0.75)),
    f('jamon-cerdo', 'Jamón de cerdo en tajadas', 'meat', usda(173864),
      measures=[m('1 tajada', 20)], diet=MEAT, section='carnes', purchase={'label': 'paquetes de 250 g', 'grams': 250}),
    f('jamon-pavo-light', 'Jamón bajo en grasa (96 % libre de grasa)', 'meat', usda(173863),
      measures=[m('1 tajada', 20)], roles=['protein'], slots=['breakfast', 'snack'], diet=MEAT, cost='medium',
      section='carnes', purchase={'label': 'paquetes de 250 g', 'grams': 250}),
    f('salchicha', 'Salchicha tipo frankfurt', 'meat', usda(174614),
      measures=[m('1 unidad', 45)], diet=MEAT, section='carnes'),
    f('chorizo', 'Chorizo de cerdo', 'meat', usda(173859),
      measures=[m('1 unidad', 60)], diet=MEAT, section='carnes'),
    f('tocineta', 'Tocineta frita', 'meat', usda(168322),
      measures=[m('1 tira', 8)], diet=MEAT, section='carnes'),
    # ───────────── Pescados y mariscos ─────────────
    f('atun-agua', 'Atún en agua, escurrido', 'fish', usda(171986),
      measures=[m('1 lata escurrida', 120), m('1 porción', 100)], roles=['protein'], slots=['lunch', 'dinner', 'snack'],
      diet=MEAT, allergens=['fish'], cost='medium', section='pescados', purchase={'label': 'latas', 'grams': 120}),
    f('tilapia', 'Tilapia (mojarra) a la plancha', 'fish', usda(175177),
      measures=[m('1 filete', 120), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'],
      cost='medium', section='pescados', cooked=CRUDO(0.8)),
    f('salmon', 'Salmón a la plancha', 'fish', usda(175168),
      measures=[m('1 filete', 150), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'],
      cost='high', section='pescados', cooked=CRUDO(0.8)),
    f('trucha', 'Trucha a la plancha', 'fish', usda(173718),
      measures=[m('1 filete', 150), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'],
      cost='medium', section='pescados', cooked=CRUDO(0.8)),
    f('bagre', 'Bagre a la plancha', 'fish', usda(175166),
      measures=[m('1 porción', 120)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'], cost='medium',
      section='pescados', cooked=CRUDO(0.8)),
    f('merluza', 'Merluza o bacalao a la plancha', 'fish', usda(171956),
      measures=[m('1 filete', 120)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'], cost='medium',
      section='pescados', cooked=CRUDO(0.8)),
    f('sardinas-tomate', 'Sardinas en salsa de tomate', 'fish', usda(175140),
      measures=[m('1 lata pequeña escurrida', 120)], roles=['protein'], slots=MAIN, diet=MEAT, allergens=['fish'],
      section='pescados', purchase={'label': 'latas', 'grams': 120}),
    f('camarones', 'Camarones cocidos', 'fish', usda(171971),
      measures=[m('1 taza', 145), m('1 porción', 100)], roles=['protein'], slots=MAIN, diet=MEAT,
      allergens=['shellfish'], cost='high', section='pescados', cooked=CRUDO(0.85)),
    # ───────────── Huevos ─────────────
    f('huevo-entero', 'Huevo entero', 'egg', usda(171287),
      measures=[m('1 unidad', 50)], roles=['protein'], slots=['breakfast', 'snack', 'dinner'], diet=OVO,
      allergens=['egg'], section='huevos-lacteos', purchase={'label': 'huevos', 'grams': 50}),
    f('huevo-cocido', 'Huevo duro (cocido)', 'egg', usda(173424),
      measures=[m('1 unidad', 50)], roles=['protein'], slots=BS, diet=OVO, allergens=['egg'], section='huevos-lacteos',
      purchase={'label': 'huevos', 'grams': 50}),
    f('claras-huevo', 'Claras de huevo', 'egg', usda(172183),
      measures=[m('1 unidad', 33), m('1 taza', 245)], roles=['protein'], slots=BS, diet=OVO, allergens=['egg'],
      section='huevos-lacteos', purchase={'label': 'huevos (solo claras)', 'grams': 33}),
    # ───────────── Lácteos (ICBF) ─────────────
    f('leche-descremada', 'Leche descremada', 'dairy', icbf('G007', 34, 3.3, 0.1, 4.9),
      measures=[m('1 vaso', 245), m('1 taza', 245)], roles=['protein'], slots=BS, diet=DAIRY, allergens=['milk'],
      section='huevos-lacteos', purchase={'label': 'litros', 'grams': 1035}),
    f('leche-entera', 'Leche entera pasteurizada', 'dairy', icbf('G012', 55, 3.2, 3.2, 3.4),
      measures=[m('1 vaso', 245), m('1 taza', 245)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos',
      purchase={'label': 'litros', 'grams': 1030}),
    f('leche-deslactosada-descremada', 'Leche deslactosada descremada', 'dairy', icbf('G007', 34, 3.3, 0.1, 4.9),
      measures=[m('1 vaso', 245)], roles=['protein'], slots=BS, diet=dict(DAIRY, lactose=False), allergens=['milk'],
      section='huevos-lacteos', purchase={'label': 'litros', 'grams': 1035}),
    f('kumis', 'Kumis entero con azúcar', 'dairy', icbf('G002', 88, 2.9, 2.5, 13.5),
      measures=[m('1 vaso', 245)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos',
      purchase={'label': 'litros', 'grams': 1040}),
    f('yogur-bebible', 'Yogur bebible entero con azúcar', 'dairy', icbf('G028', 81, 2.9, 2.8, 11.2),
      measures=[m('1 vaso', 245)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos',
      purchase={'label': 'litros', 'grams': 1040}),
    f('yogur-griego', 'Yogur griego natural sin grasa', 'dairy', usda(170894),
      measures=[m('1 pote', 150), m('1 taza', 245)], roles=['protein'], slots=BS, diet=DAIRY, allergens=['milk'],
      cost='medium', section='huevos-lacteos', purchase={'label': 'potes de 150 g', 'grams': 150}),
    f('yogur-griego-light', 'Yogur griego natural bajo en grasa', 'dairy', usda(170903),
      measures=[m('1 pote', 150)], roles=['protein'], slots=BS, diet=DAIRY, allergens=['milk'], cost='medium',
      section='huevos-lacteos', purchase={'label': 'potes de 150 g', 'grams': 150}),
    f('queso-cottage', 'Queso cottage bajo en grasa', 'dairy', usda(172182),
      measures=[m('1 taza', 225), m('1 cucharada', 15)], roles=['protein'], slots=BS, diet=DAIRY, allergens=['milk'],
      cost='medium', section='huevos-lacteos'),
    f('queso-campesino', 'Queso campesino', 'dairy', icbf('G017', 301, 17.5, 25.5, 0.3),
      measures=[m('1 tajada', 30), m('1 porción', 40)], roles=['fat'], slots=BS, diet=DAIRY, allergens=['milk'],
      section='huevos-lacteos'),
    f('queso-costeno', 'Queso costeño', 'dairy', icbf('G018', 303, 17.5, 25.5, 0.9),
      measures=[m('1 tajada', 30), m('1 porción', 40)], roles=['fat'], slots=BS, diet=DAIRY, allergens=['milk'],
      section='huevos-lacteos'),
    f('cuajada', 'Cuajada', 'dairy', icbf('G016', 207, 15.2, 15.4, 2.0),
      measures=[m('1 tajada', 40)], roles=['fat'], slots=BS, diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('queso-mozzarella', 'Queso mozzarella', 'dairy', icbf('G019', 296, 22.9, 21.4, 3.1),
      measures=[m('1 tajada', 20), m('1 taza rallado', 110)], diet=DAIRY, allergens=['milk'], cost='medium',
      section='huevos-lacteos'),
    f('queso-doble-crema', 'Queso doble crema', 'dairy', icbf('G021', 286, 23.4, 18.7, 5.9),
      measures=[m('1 tajada', 20)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('queso-suero', 'Suero costeño', 'dairy', icbf('G015', 83, 11.0, 1.5, 6.4),
      measures=[m('1 cucharada', 15)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('queso-parmesano', 'Queso parmesano rallado', 'dairy', usda(171247),
      measures=[m('1 cucharada', 5)], diet=dict(DAIRY, lactose=False), allergens=['milk'], cost='high',
      section='huevos-lacteos'),
    f('leche-polvo-descremada', 'Leche descremada en polvo', 'dairy', icbf('G006', 358, 36.2, 0.5, 52.2),
      measures=[m('1 cucharada', 7)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('crema-leche', 'Crema de leche', 'dairy', icbf('G001', 330, 2.1, 35.0, 1.7),
      measures=[m('1 cucharada', 15)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('queso-crema', 'Queso crema', 'dairy', icbf('G014', 293, 16.4, 25.1, 0.4),
      measures=[m('1 cucharada', 15)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    # ───────────── Suplementos y proteína vegetal ─────────────
    f('whey', 'Proteína whey en polvo', 'supplement', usda(173180),
      measures=[m('1 scoop', 30)], roles=['protein'], slots=BS, diet=DAIRY, allergens=['milk'], cost='high',
      section='suplementos', purchase={'label': 'scoops', 'grams': 30}),
    f('proteina-soya', 'Proteína de soya aislada (polvo)', 'supplement', usda(174276),
      measures=[m('1 scoop', 30)], roles=['protein'], slots=BS, diet=VEGAN, allergens=['soy'], cost='high',
      section='suplementos', purchase={'label': 'scoops', 'grams': 30}),
    f('tofu', 'Tofu', 'plant-protein', icbf('T032', 142, 17.4, 7.7, 0.5, 0.3),
      measures=[m('1 porción', 100)], roles=['protein'], slots=['breakfast', 'lunch', 'dinner'], diet=VEGAN,
      allergens=['soy'], cost='medium', section='huevos-lacteos'),
    f('bebida-soya', 'Bebida de soya sin azúcar', 'beverage', icbf('T004', 40, 2.6, 1.7, 3.2, 1.1),
      measures=[m('1 vaso', 245)], diet=VEGAN, allergens=['soy'], cost='medium', section='huevos-lacteos',
      purchase={'label': 'litros', 'grams': 1030}),
    # ───────────── Leguminosas (ICBF) ─────────────
    f('lentejas', 'Lentejas cocidas', 'legume', icbf('T025', 122, 7.7, 0.5, 18.5, 6.5),
      measures=[m('1 taza', 200), m('1 cucharón', 100)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN,
      section='granos-cereales', cooked=SECO(2.5)),
    f('frijol-cargamanto', 'Fríjol cargamanto cocido', 'legume', icbf('T010', 161, 8.1, 0.6, 26.9, 7.6),
      measures=[m('1 taza', 170), m('1 cucharón', 100)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN,
      section='granos-cereales', cooked=SECO(2.4)),
    f('frijol-negro', 'Fríjol negro cocido', 'legume', usda(173735),
      measures=[m('1 taza', 172)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN, section='granos-cereales',
      cooked=SECO(2.4)),
    f('frijol-rojo', 'Fríjol rojo cocido', 'legume', usda(175194),
      measures=[m('1 taza', 177)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN, section='granos-cereales',
      cooked=SECO(2.4)),
    f('garbanzos', 'Garbanzos cocidos', 'legume', icbf('T018', 187, 8.6, 2.3, 26.0, 13.6),
      measures=[m('1 taza', 165)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN, section='granos-cereales',
      cooked=SECO(2.3)),
    f('arveja-seca', 'Arveja seca cocida', 'legume', icbf('T002', 138, 8.1, 0.4, 22.4, 6.0),
      measures=[m('1 taza', 160)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN, section='granos-cereales',
      cooked=SECO(2.4)),
    f('arveja-verde', 'Arveja verde cocida', 'vegetable', icbf('B018', 120, 6.7, 0.3, 19.7, 6.0),
      measures=[m('1 taza', 160)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('frijol-verde', 'Fríjol verde cocido', 'legume', icbf('B045', 147, 9.3, 0.4, 25.5, 2.2),
      measures=[m('1 taza', 170)], roles=['protein', 'carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('hummus', 'Hummus', 'legume', usda(174289),
      measures=[m('1 cucharada', 15)], diet=VEGAN, cost='medium', section='despensa'),
    # ───────────── Cereales y panadería (ICBF) ─────────────
    f('arroz-blanco', 'Arroz blanco cocido', 'grain', icbf('A009', 161, 2.3, 2.1, 32.5, 1.6),
      measures=[m('1 taza', 160), m('1 cucharada', 12)], roles=['carb'], slots=['lunch', 'dinner', 'snack'],
      diet=VEGAN, section='granos-cereales', cooked=SECO(2.4)),
    f('arroz-integral', 'Arroz integral cocido', 'grain', usda(169704),
      measures=[m('1 taza', 195)], roles=['carb'], slots=MAIN, diet=VEGAN, section='granos-cereales',
      cooked=SECO(2.5)),
    f('arepa-maiz', 'Arepa de maíz blanca asada', 'bread', icbf('A006', 162, 4.1, 0.0, 36.3, 1.0),
      measures=[m('1 unidad mediana', 80), m('1 unidad pequeña', 50)], roles=['carb'], slots=ALL, diet=VEGAN,
      section='panaderia', purchase={'label': 'arepas', 'grams': 80}),
    f('arepa-precocida', 'Arepa de maíz precocida (empacada)', 'bread', icbf('A004', 163, 3.3, 0.9, 35.0, 0.9),
      measures=[m('1 unidad mediana', 80)], roles=['carb'], slots=ALL, diet=VEGAN, section='panaderia',
      purchase={'label': 'arepas', 'grams': 80}),
    f('arepa-queso', 'Arepa de maíz con queso', 'bread', icbf('A007', 211, 4.8, 8.4, 29.0),
      measures=[m('1 unidad', 100)], diet=DAIRY, allergens=['milk'], section='panaderia',
      purchase={'label': 'arepas', 'grams': 100}),
    f('harina-maiz-precocida', 'Harina de maíz blanco precocida', 'grain', icbf('A034', 380, 9.1, 3.7, 73.9, 7.5),
      measures=[m('1 taza', 120), m('1 cucharada', 10)], diet=VEGAN, section='granos-cereales'),
    f('avena-hojuelas', 'Avena en hojuelas', 'grain', icbf('A012', 411, 16.9, 7.5, 64.1, 9.8),
      measures=[m('1 taza', 80), m('1 cucharada', 6)], roles=['carb'], slots=BS, diet=WHEAT_VEGAN,
      allergens=['gluten'], section='granos-cereales'),
    f('pan-tajado', 'Pan tajado blanco', 'bread', icbf('A061', 278, 8.9, 1.6, 56.8, 0.7),
      measures=[m('1 tajada', 25)], roles=['carb'], slots=BS, diet=WHEAT, allergens=['gluten', 'milk'],
      section='panaderia', purchase={'label': 'paquetes de 500 g', 'grams': 500}),
    f('pan-integral', 'Pan integral', 'bread', icbf('A069', 279, 9.4, 3.1, 50.4, 6.5),
      measures=[m('1 tajada', 30)], roles=['carb'], slots=BS, diet=WHEAT, allergens=['gluten'], section='panaderia',
      purchase={'label': 'paquetes de 500 g', 'grams': 500}),
    f('pan-blanco', 'Pan blanco (mogolla, pan francés)', 'bread', icbf('A060', 268, 8.9, 3.4, 48.8, 3.2),
      measures=[m('1 unidad', 60)], roles=['carb'], slots=BS, diet=WHEAT, allergens=['gluten'], section='panaderia',
      purchase={'label': 'panes', 'grams': 60}),
    f('pan-leche', 'Pan de leche', 'bread', icbf('A064', 281, 8.6, 4.8, 49.7, 2.1),
      measures=[m('1 unidad', 50)], diet=dict(WHEAT, lactose=True), allergens=['gluten', 'milk'], section='panaderia'),
    f('mogolla-integral', 'Mogolla integral', 'bread', icbf('A057', 310, 7.2, 1.9, 66.1),
      measures=[m('1 unidad', 70)], roles=['carb'], slots=BS, diet=WHEAT, allergens=['gluten'], section='panaderia',
      purchase={'label': 'mogollas', 'grams': 70}),
    f('almojabana', 'Almojábana', 'bread', icbf('A002', 285, 13.0, 12.3, 30.6),
      measures=[m('1 unidad', 60)], diet=DAIRY, allergens=['milk', 'egg'], section='panaderia'),
    f('pandebono', 'Pandebono', 'bread', icbf('A070', 357, 15.8, 10.1, 50.7),
      measures=[m('1 unidad', 50)], diet=DAIRY, allergens=['milk', 'egg'], section='panaderia'),
    f('pan-yuca', 'Pan de yuca', 'bread', icbf('A067', 355, 15.8, 12.2, 45.5),
      measures=[m('1 unidad', 50)], diet=DAIRY, allergens=['milk', 'egg'], section='panaderia'),
    f('pan-queso', 'Pan de queso', 'bread', icbf('A065', 367, 10.4, 20.8, 33.5, 2.1),
      measures=[m('1 unidad', 60)], diet=dict(WHEAT, lactose=True), allergens=['gluten', 'milk'], section='panaderia'),
    f('pan-centeno', 'Pan de centeno', 'bread', icbf('A062', 257, 9.3, 1.2, 52.3),
      measures=[m('1 tajada', 30)], roles=['carb'], slots=BS, diet=WHEAT_VEGAN, allergens=['gluten'],
      section='panaderia'),
    f('harina-trigo', 'Harina de trigo todo propósito', 'grain', icbf('A040', 360, 12.5, 1.7, 72.3, 2.6),
      measures=[m('1 taza', 125), m('1 cucharada', 8)], diet=WHEAT_VEGAN, allergens=['gluten'],
      section='granos-cereales'),
    f('pasta-cocida', 'Pasta cocida', 'grain', icbf('A073', 143, 5.8, 0.9, 27.0, 1.8),
      measures=[m('1 taza', 140)], roles=['carb'], slots=MAIN, diet=WHEAT_VEGAN, allergens=['gluten'],
      section='granos-cereales', cooked=SECO(2.5)),
    f('pasta-integral', 'Pasta integral cocida', 'grain', usda(168910),
      measures=[m('1 taza', 140)], roles=['carb'], slots=MAIN, diet=WHEAT_VEGAN, allergens=['gluten'],
      section='granos-cereales', cooked=SECO(2.5)),
    f('quinua', 'Quinua cocida', 'grain', usda(168917),
      measures=[m('1 taza', 185)], roles=['carb'], slots=MAIN, diet=VEGAN, cost='medium', section='granos-cereales',
      cooked=SECO(2.8)),
    f('mazorca', 'Mazorca (maíz tierno) cocida', 'grain', usda(169999),
      measures=[m('1 unidad (granos)', 150), m('1 taza', 145)], roles=['carb'], slots=MAIN, diet=VEGAN,
      section='frutas-verduras', purchase={'label': 'mazorcas', 'grams': 150}),
    f('mute-maiz', 'Maíz mute cocido', 'grain', icbf('A048', 98, 2.5, 0.5, 21.0),
      measures=[m('1 taza', 165)], diet=VEGAN, section='granos-cereales'),
    f('tortilla-maiz', 'Tortilla de maíz', 'bread', usda(175036),
      measures=[m('1 unidad', 26)], roles=['carb'], slots=MAIN, diet=VEGAN, section='panaderia'),
    f('cereal-hojuelas-maiz', 'Cereal de hojuelas de maíz sin azúcar', 'grain', icbf('A015', 383, 8.1, 0.4, 85.0, 3.3),
      measures=[m('1 taza', 30)], roles=['carb'], slots=BS, diet=VEGAN, section='granos-cereales'),
    f('granola', 'Granola', 'grain', usda(171646),
      measures=[m('1 taza', 120), m('1 cucharada', 8)], diet=WHEAT_VEGAN, allergens=['gluten', 'tree-nuts'],
      cost='medium', section='granos-cereales'),
    f('galletas-soda', 'Galletas de soda', 'bread', icbf('A027', 424, 9.6, 9.7, 72.9, 3.0),
      measures=[m('1 unidad', 8), m('1 paquete', 25)], roles=['carb'], slots=['snack'], diet=WHEAT,
      allergens=['gluten'], section='despensa'),
    f('galletas-integrales', 'Galletas integrales', 'bread', usda(172749),
      measures=[m('1 unidad', 4), m('1 paquete', 30)], diet=WHEAT_VEGAN, allergens=['gluten'], section='despensa'),
    f('tostadas', 'Tostadas o calados', 'bread', icbf('A087', 398, 10.0, 6.8, 72.3, 3.6),
      measures=[m('1 unidad', 10)], diet=WHEAT, allergens=['gluten'], section='panaderia'),
    f('crispetas', 'Crispetas (palomitas) sin mantequilla', 'grain', usda(170246),
      measures=[m('1 taza', 8)], diet=VEGAN, section='despensa'),
    f('tortas-arroz', 'Tortas de arroz integral', 'grain', usda(170250),
      measures=[m('1 unidad', 9)], roles=['carb'], slots=['snack'], diet=VEGAN, section='despensa'),
    f('envuelto-mazorca', 'Envuelto de mazorca', 'prepared', icbf('A019', 186, 4.8, 7.9, 23.5, 0.8),
      measures=[m('1 unidad', 120)], diet=dict(DAIRY), allergens=['milk'], section='panaderia'),
    # ───────────── Tubérculos y plátanos (ICBF) ─────────────
    f('papa-criolla', 'Papa criolla cocida con cáscara', 'tuber', icbf('B070', 85, 1.4, 0.0, 18.1, 3.0),
      measures=[m('1 unidad', 25), m('1 taza', 150)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('papa-pastusa', 'Papa pastusa cocida', 'tuber', icbf('B075', 96, 2.0, 0.1, 20.9, 1.8),
      measures=[m('1 unidad mediana', 150), m('1 taza en cubos', 155)], roles=['carb'], slots=MAIN, diet=VEGAN,
      section='frutas-verduras'),
    f('papa-sabanera', 'Papa sabanera cocida', 'tuber', icbf('B067', 98, 2.1, 0.1, 21.4, 1.7),
      measures=[m('1 unidad mediana', 150)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('papa-francesa', 'Papas a la francesa', 'tuber', icbf('B069', 313, 3.4, 15.5, 38.2, 3.7),
      measures=[m('1 porción', 100)], diet=VEGAN, section='frutas-verduras'),
    f('yuca', 'Yuca cocida', 'tuber', icbf('B106', 157, 0.7, 0.2, 36.6, 2.7),
      measures=[m('1 trozo', 100)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('yuca-frita', 'Yuca frita', 'tuber', icbf('B108', 231, 0.9, 5.1, 43.6, 3.4),
      measures=[m('1 trozo', 80)], diet=VEGAN, section='frutas-verduras'),
    f('platano-maduro', 'Plátano maduro cocido o asado', 'tuber', icbf('B088', 130, 0.8, 0.2, 30.1, 2.3),
      measures=[m('1 unidad mediana', 200), m('1 tajada', 30)], roles=['carb'], slots=['lunch', 'dinner', 'breakfast'],
      diet=VEGAN, section='frutas-verduras', purchase={'label': 'plátanos', 'grams': 200}),
    f('platano-verde', 'Plátano verde cocido', 'tuber', icbf('B091', 133, 0.9, 0.3, 30.6, 2.3),
      measures=[m('1 unidad mediana', 200)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras',
      purchase={'label': 'plátanos', 'grams': 200}),
    f('patacon', 'Patacón (plátano verde frito)', 'tuber', icbf('B093', 353, 1.6, 19.2, 41.8, 3.5),
      measures=[m('1 unidad', 40)], diet=VEGAN, section='frutas-verduras'),
    f('maduro-frito', 'Tajadas de maduro fritas', 'tuber', icbf('B090', 312, 1.2, 10.2, 52.6, 2.5),
      measures=[m('1 tajada', 30)], diet=VEGAN, section='frutas-verduras'),
    f('batata', 'Batata (camote) cocida', 'tuber', usda(168484),
      measures=[m('1 unidad mediana', 150)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    f('arracacha', 'Arracacha', 'tuber', icbf('B015', 111, 0.9, 0.1, 26.3, 0.6),
      measures=[m('1 trozo', 100)], roles=['carb'], slots=MAIN, diet=VEGAN, section='frutas-verduras'),
    # ───────────── Verduras (ICBF) ─────────────
    f('brocoli', 'Brócoli cocido', 'vegetable', usda(169967),
      measures=[m('1 taza', 155)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('espinaca', 'Espinaca', 'vegetable', icbf('B044', 34, 2.9, 0.2, 3.8, 2.6),
      measures=[m('1 taza cruda', 30), m('1 taza cocida', 180)], roles=['vegetable'], slots=MAIN,
      section='frutas-verduras'),
    f('lechuga', 'Lechuga', 'vegetable', icbf('B059', 18, 0.8, 0.1, 2.6, 1.7),
      measures=[m('1 taza', 50)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('lechuga-romana', 'Lechuga romana', 'vegetable', icbf('B060', 23, 1.1, 0.1, 3.3, 2.1),
      measures=[m('1 taza', 50)], section='frutas-verduras'),
    f('tomate', 'Tomate', 'vegetable', icbf('B103', 23, 0.9, 0.1, 4.1, 1.2),
      measures=[m('1 unidad', 120)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('cebolla-cabezona', 'Cebolla cabezona', 'vegetable', icbf('B027', 40, 1.4, 0.1, 7.7, 1.7),
      measures=[m('1 unidad mediana', 110), m('1 cucharada picada', 10)], section='frutas-verduras'),
    f('zanahoria', 'Zanahoria cocida', 'vegetable', icbf('B109', 43, 0.8, 0.2, 8.1, 2.8),
      measures=[m('1 unidad mediana', 70), m('1 taza', 155)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('zanahoria-cruda', 'Zanahoria cruda rallada', 'vegetable', icbf('B110', 47, 0.7, 0.1, 9.5, 2.7),
      measures=[m('1 taza', 110)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('habichuela', 'Habichuela cocida', 'vegetable', icbf('B051', 32, 1.6, 0.1, 4.8, 2.8),
      measures=[m('1 taza', 125)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('ahuyama', 'Ahuyama cocida', 'vegetable', icbf('B005', 48, 0.7, 0.7, 8.4, 2.5),
      measures=[m('1 taza', 205)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('pepino', 'Pepino cohombro', 'vegetable', icbf('B077', 14, 0.5, 0.1, 2.3, 0.7),
      measures=[m('1 unidad', 200), m('1 taza en rodajas', 120)], roles=['vegetable'], slots=MAIN,
      section='frutas-verduras'),
    f('coliflor', 'Coliflor cocida', 'vegetable', icbf('B038', 41, 1.9, 0.2, 6.7, 2.4),
      measures=[m('1 taza', 125)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('champinones', 'Champiñones', 'vegetable', icbf('B033', 32, 3.1, 0.6, 3.0, 1.0),
      measures=[m('1 taza', 70)], roles=['vegetable'], slots=MAIN, cost='medium', section='frutas-verduras'),
    f('repollo', 'Repollo blanco', 'vegetable', icbf('B099', 40, 1.8, 0.3, 6.4, 2.6),
      measures=[m('1 taza picado', 90)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('calabacin', 'Calabacín cocido', 'vegetable', usda(169292),
      measures=[m('1 taza', 180)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('pimenton', 'Pimentón rojo', 'vegetable', icbf('B080', 35, 1.0, 0.3, 6.3, 1.7),
      measures=[m('1 unidad', 120)], section='frutas-verduras'),
    f('berenjena', 'Berenjena cocida', 'vegetable', icbf('B022', 37, 0.8, 0.2, 6.7, 2.5),
      measures=[m('1 taza', 100)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('acelga', 'Acelga', 'vegetable', icbf('B003', 38, 2.4, 0.2, 5.3, 2.8),
      measures=[m('1 taza', 40)], section='frutas-verduras'),
    f('remolacha', 'Remolacha cocida', 'vegetable', icbf('B097', 53, 1.5, 0.2, 10.1, 2.7),
      measures=[m('1 unidad', 80)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    f('apio', 'Apio', 'vegetable', icbf('B014', 26, 0.7, 0.2, 4.6, 1.9),
      measures=[m('1 tallo', 40)], section='frutas-verduras'),
    f('cilantro', 'Cilantro', 'vegetable', icbf('B035', 44, 2.3, 0.6, 5.9, 2.8),
      measures=[m('1 cucharada picado', 4)], section='frutas-verduras'),
    f('cebolla-larga', 'Cebolla larga (junca)', 'vegetable', icbf('B029', 37, 1.2, 0.1, 6.8, 2.0),
      measures=[m('1 tallo', 30)], section='frutas-verduras'),
    f('esparragos', 'Espárragos cocidos', 'vegetable', icbf('B041', 35, 2.6, 0.3, 4.4, 2.0),
      measures=[m('1 taza', 180)], roles=['vegetable'], slots=MAIN, cost='medium', section='frutas-verduras'),
    f('guatila', 'Guatila (cidra)', 'vegetable', icbf('B048', 27, 0.8, 0.0, 5.2, 1.7),
      measures=[m('1 taza', 130)], roles=['vegetable'], slots=MAIN, section='frutas-verduras'),
    # ───────────── Frutas (ICBF) ─────────────
    f('banano', 'Banano', 'fruit', icbf('C010', 101, 1.5, 0.1, 22.3, 2.6),
      measures=[m('1 unidad mediana', 120)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'bananos', 'grams': 120}),
    f('mango', 'Mango', 'fruit', icbf('C051', 79, 0.6, 0.0, 17.1, 3.9),
      measures=[m('1 unidad (pulpa)', 200), m('1 taza', 165)], roles=['fruit', 'carb'], slots=BS,
      section='frutas-verduras', purchase={'label': 'mangos', 'grams': 200}),
    f('papaya', 'Papaya', 'fruit', icbf('C065', 40, 0.5, 0.1, 8.2, 2.0),
      measures=[m('1 taza', 145), m('1 tajada', 150)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('guayaba', 'Guayaba', 'fruit', icbf('C031', 71, 0.9, 0.3, 13.4, 5.4),
      measures=[m('1 unidad', 90)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'guayabas', 'grams': 90}),
    f('pina', 'Piña', 'fruit', icbf('C072', 56, 0.6, 0.1, 12.4, 1.7),
      measures=[m('1 taza', 165), m('1 tajada', 85)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('manzana', 'Manzana', 'fruit', icbf('C054', 72, 0.3, 0.2, 16.5, 1.5),
      measures=[m('1 unidad mediana', 170)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'manzanas', 'grams': 170}),
    f('pera', 'Pera', 'fruit', icbf('C071', 63, 0.3, 0.2, 12.9, 4.4),
      measures=[m('1 unidad mediana', 170)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'peras', 'grams': 170}),
    f('naranja', 'Naranja', 'fruit', icbf('C062', 41, 0.7, 0.3, 8.8, 0.2),
      measures=[m('1 unidad', 140)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'naranjas', 'grams': 140}),
    f('mandarina', 'Mandarina', 'fruit', icbf('C050', 54, 0.9, 0.1, 11.4, 1.8),
      measures=[m('1 unidad', 90)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'mandarinas', 'grams': 90}),
    f('fresa', 'Fresas', 'fruit', icbf('C025', 45, 0.8, 0.5, 8.3, 2.0),
      measures=[m('1 taza', 150)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('mora', 'Mora de Castilla', 'fruit', icbf('C061', 74, 1.0, 0.1, 14.6, 5.3),
      measures=[m('1 taza', 145)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('lulo', 'Lulo', 'fruit', icbf('C045', 48, 0.9, 0.1, 8.9, 3.6),
      measures=[m('1 unidad (pulpa)', 80)], roles=['fruit'], slots=BS, section='frutas-verduras',
      purchase={'label': 'lulos', 'grams': 80}),
    f('maracuya', 'Maracuyá', 'fruit', icbf('C056', 60, 1.5, 0.5, 12.4, 0.2),
      measures=[m('1 unidad (pulpa)', 50)], roles=['fruit'], slots=BS, section='frutas-verduras',
      purchase={'label': 'maracuyás', 'grams': 50}),
    f('granadilla', 'Granadilla', 'fruit', icbf('C028', 95, 2.1, 1.6, 14.9, 5.9),
      measures=[m('1 unidad (pulpa)', 60)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'granadillas', 'grams': 60}),
    f('uchuva', 'Uchuvas', 'fruit', icbf('C084', 77, 1.5, 0.5, 14.2, 5.1),
      measures=[m('1 taza', 140)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('tomate-arbol', 'Tomate de árbol', 'fruit', icbf('C082', 55, 2.0, 0.2, 10.2, 2.0),
      measures=[m('1 unidad (pulpa)', 60)], roles=['fruit'], slots=BS, section='frutas-verduras',
      purchase={'label': 'tomates de árbol', 'grams': 60}),
    f('sandia', 'Sandía', 'fruit', icbf('C079', 17, 0.4, 0.0, 3.7, 0.4),
      measures=[m('1 taza', 155), m('1 tajada', 280)], roles=['fruit'], slots=BS, section='frutas-verduras'),
    f('melon', 'Melón', 'fruit', icbf('C060', 25, 0.7, 0.0, 5.0, 1.0),
      measures=[m('1 taza', 160)], roles=['fruit'], slots=BS, section='frutas-verduras'),
    f('uva', 'Uvas', 'fruit', icbf('C086', 51, 0.4, 0.0, 12.1, 0.4),
      measures=[m('1 taza', 150)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras'),
    f('kiwi', 'Kiwi', 'fruit', icbf('C042', 73, 1.0, 0.4, 15.0, 2.9),
      measures=[m('1 unidad', 70)], roles=['fruit', 'carb'], slots=BS, cost='medium', section='frutas-verduras',
      purchase={'label': 'kiwis', 'grams': 70}),
    f('pitahaya', 'Pitahaya amarilla', 'fruit', icbf('C075', 63, 0.4, 0.1, 13.6, 3.3),
      measures=[m('1 unidad (pulpa)', 150)], roles=['fruit', 'carb'], slots=BS, cost='medium',
      section='frutas-verduras', purchase={'label': 'pitahayas', 'grams': 150}),
    f('guanabana', 'Guanábana', 'fruit', icbf('C030', 33, 0.6, 0.2, 6.8, 0.8),
      measures=[m('1 taza', 225)], roles=['fruit'], slots=BS, section='frutas-verduras'),
    f('feijoa', 'Feijoa', 'fruit', icbf('C024', 83, 1.7, 0.0, 15.8, 6.4),
      measures=[m('1 unidad', 50)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'feijoas', 'grams': 50}),
    f('ciruela', 'Ciruela', 'fruit', icbf('C017', 53, 0.6, 0.1, 11.1, 2.4),
      measures=[m('1 unidad', 65)], roles=['fruit'], slots=BS, section='frutas-verduras'),
    f('durazno', 'Durazno', 'fruit', icbf('C023', 58, 1.0, 0.1, 12.5, 1.5),
      measures=[m('1 unidad', 150)], roles=['fruit', 'carb'], slots=BS, section='frutas-verduras',
      purchase={'label': 'duraznos', 'grams': 150}),
    f('papayuela', 'Papayuela', 'fruit', icbf('C067', 27, 0.7, 0.1, 5.1, 1.3),
      measures=[m('1 unidad (pulpa)', 80)], section='frutas-verduras'),
    f('zapote', 'Zapote', 'fruit', icbf('C089', 59, 1.1, 0.0, 11.7, 3.5),
      measures=[m('1 unidad (pulpa)', 150)], section='frutas-verduras'),
    f('curuba', 'Curuba', 'fruit', icbf('C021', 38, 0.6, 0.1, 8.5, 0.1),
      measures=[m('1 unidad (pulpa)', 60)], section='frutas-verduras'),
    f('gulupa', 'Gulupa', 'fruit', icbf('C033', 74, 0.9, 0.1, 17.2, 0.2),
      measures=[m('1 unidad (pulpa)', 40)], section='frutas-verduras'),
    f('limon', 'Limón', 'fruit', icbf('C044', 44, 0.3, 0.3, 9.3, 1.5),
      measures=[m('1 unidad (jugo)', 30)], section='frutas-verduras'),
    f('coco', 'Coco fresco', 'fruit', icbf('C019', 402, 3.6, 35.5, 12.6, 9.0),
      measures=[m('1 taza rallado', 80)], section='frutas-verduras'),
    f('chontaduro', 'Chontaduro', 'fruit', icbf('C016', 358, 6.3, 25.7, 19.0, 12.7),
      measures=[m('1 unidad', 30)], section='frutas-verduras'),
    f('aguacate', 'Aguacate (Lorena o común)', 'fruit', icbf('C002', 179, 1.6, 13.3, 10.0, 6.6),
      measures=[m('1 porción (¼ de aguacate)', 60), m('1 tajada', 30)], roles=['fat'],
      slots=['breakfast', 'lunch', 'dinner'], section='frutas-verduras', purchase={'label': 'aguacates', 'grams': 240}),
    f('aguacate-hass', 'Aguacate Hass', 'fruit', icbf('C001', 221, 1.3, 16.4, 13.5, 6.8),
      measures=[m('1 unidad (pulpa)', 140), m('1 porción (¼)', 35)], roles=['fat'], slots=['breakfast', 'lunch', 'dinner'],
      cost='medium', section='frutas-verduras', purchase={'label': 'aguacates Hass', 'grams': 140}),
    # ───────────── Grasas, frutos secos y semillas ─────────────
    f('aceite-oliva', 'Aceite de oliva', 'fat', usda(171413),
      measures=[m('1 cucharada', 13.5), m('1 cucharadita', 4.5)], roles=['fat'], slots=['breakfast', 'lunch', 'dinner'],
      cost='medium', section='despensa'),
    f('aceite-vegetal', 'Aceite vegetal (canola)', 'fat', usda(172336),
      measures=[m('1 cucharada', 14), m('1 cucharadita', 4.5)], roles=['fat'], slots=['lunch', 'dinner'],
      section='despensa'),
    f('aceite-coco', 'Aceite de coco', 'fat', usda(171412),
      measures=[m('1 cucharada', 13.6)], section='despensa', cost='medium'),
    f('mantequilla', 'Mantequilla', 'fat', usda(173430),
      measures=[m('1 cucharadita', 5), m('1 cucharada', 14)], diet=dict(DAIRY, lactose=False), allergens=['milk'],
      section='huevos-lacteos'),
    f('mani-tostado', 'Maní tostado sin sal', 'nut-seed', icbf('T029', 650, 25.9, 50.4, 19.2, 7.8),
      measures=[m('1 puñado', 28), m('1 cucharada', 9)], roles=['fat'], slots=['snack', 'breakfast'],
      allergens=['peanut'], section='despensa'),
    f('mantequilla-mani', 'Mantequilla de maní natural', 'nut-seed', usda(172470),
      measures=[m('1 cucharada', 16)], roles=['fat'], slots=BS, allergens=['peanut'], cost='medium',
      section='despensa'),
    f('almendras', 'Almendras', 'nut-seed', icbf('C003', 639, 18.6, 54.1, 13.9, 10.9),
      measures=[m('1 puñado', 28), m('1 unidad', 1.2)], roles=['fat'], slots=['snack', 'breakfast'],
      allergens=['tree-nuts'], cost='high', section='despensa'),
    f('nueces', 'Nueces', 'nut-seed', usda(170187),
      measures=[m('1 puñado', 28)], roles=['fat'], slots=['snack', 'breakfast'], allergens=['tree-nuts'], cost='high',
      section='despensa'),
    f('maranon', 'Marañón tostado sin sal', 'nut-seed', icbf('C059', 620, 15.3, 46.4, 33.9, 3.0),
      measures=[m('1 puñado', 28)], roles=['fat'], slots=['snack'], allergens=['tree-nuts'], cost='high',
      section='despensa'),
    f('semillas-chia', 'Semillas de chía', 'nut-seed', usda(170554),
      measures=[m('1 cucharada', 12)], roles=['fat'], slots=BS, cost='medium', section='despensa'),
    f('linaza', 'Linaza molida', 'nut-seed', usda(169414),
      measures=[m('1 cucharada', 7)], section='despensa'),
    f('semillas-girasol', 'Semillas de girasol tostadas', 'nut-seed', usda(170563),
      measures=[m('1 cucharada', 9)], section='despensa'),
    f('semillas-calabaza', 'Semillas de calabaza tostadas', 'nut-seed', usda(170557),
      measures=[m('1 cucharada', 9)], cost='medium', section='despensa'),
    f('mayonesa', 'Mayonesa', 'fat', usda(171009),
      measures=[m('1 cucharada', 14)], diet=OVO, allergens=['egg'], section='despensa'),
    f('mayonesa-light', 'Mayonesa light', 'fat', usda(173594),
      measures=[m('1 cucharada', 15)], diet=OVO, allergens=['egg'], section='despensa'),
    # ───────────── Dulces y azúcares (ICBF) ─────────────
    f('panela', 'Panela', 'sweet', icbf('K033', 364, 0.6, 0.1, 90.2),
      measures=[m('1 cucharada rallada', 12), m('1 trozo', 25)], section='despensa'),
    f('azucar', 'Azúcar blanca', 'sweet', icbf('K003', 397, 0.0, 0.0, 99.3),
      measures=[m('1 cucharadita', 4), m('1 cucharada', 12.5)], section='despensa'),
    f('miel', 'Miel de abejas', 'sweet', icbf('K031', 332, 0.6, 0.0, 82.4),
      measures=[m('1 cucharada', 21)], diet=OVO, section='despensa'),
    f('bocadillo', 'Bocadillo de guayaba', 'sweet', icbf('K005', 332, 0.4, 0.5, 79.6, 3.7),
      measures=[m('1 unidad', 25)], roles=['carb'], slots=['snack'], section='despensa'),
    f('arequipe', 'Arequipe', 'sweet', icbf('K001', 320, 6.4, 7.5, 56.7),
      measures=[m('1 cucharada', 20)], diet=DAIRY, allergens=['milk'], section='despensa'),
    f('mermelada', 'Mermelada', 'sweet', icbf('K030', 272, 0.5, 0.0, 66.5, 1.9),
      measures=[m('1 cucharada', 20)], section='despensa'),
    f('chocolate-mesa', 'Chocolate de mesa (pastilla con azúcar)', 'sweet', icbf('K010', 466, 3.6, 16.6, 75.5),
      measures=[m('1 pastilla', 40)], section='despensa'),
    f('chocolate-oscuro', 'Chocolate oscuro 70–85 %', 'sweet', usda(170273),
      measures=[m('1 cuadrito', 10), m('1 barra', 100)], cost='medium', section='despensa'),
    f('helado-crema', 'Helado de crema', 'sweet', icbf('K023', 196, 3.2, 10.3, 22.8),
      measures=[m('1 bola', 65)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    f('gelatina', 'Gelatina preparada con azúcar', 'sweet', icbf('K019', 67, 1.4, 0.0, 15.4),
      measures=[m('1 porción', 150)], diet=MEAT, section='despensa'),
    f('arroz-con-leche', 'Arroz con leche', 'sweet', icbf('K002', 89, 3.3, 1.5, 15.5, 0.1),
      measures=[m('1 taza', 240)], diet=DAIRY, allergens=['milk'], section='despensa'),
    # ───────────── Bebidas ─────────────
    f('jugo-naranja', 'Jugo de naranja natural', 'beverage', usda(169098),
      measures=[m('1 vaso', 245)], section='frutas-verduras'),
    f('gaseosa', 'Gaseosa tipo cola', 'beverage', usda(174852),
      measures=[m('1 vaso', 250), m('1 botella personal', 400)], section='despensa'),
    f('cerveza', 'Cerveza', 'beverage', usda(168746),
      measures=[m('1 botella o lata', 330)], diet=WHEAT_VEGAN, allergens=['gluten'], section='despensa'),
    f('tinto', 'Café tinto sin azúcar', 'beverage', usda(171890),
      measures=[m('1 pocillo', 150)], section='despensa'),
    f('chocolate-leche', 'Chocolate en agua y leche', 'beverage', icbf('S009', 89, 3.4, 3.6, 10.3, 1.0),
      measures=[m('1 pocillo', 200)], diet=DAIRY, allergens=['milk'], section='despensa'),
    f('agua-panela', 'Aguapanela', 'beverage', icbf('K033', 36, 0.1, 0.0, 9.0),
      measures=[m('1 vaso', 245)], section='despensa'),
    f('leche-chocolatada', 'Leche chocolatada', 'beverage', usda(170879),
      measures=[m('1 vaso', 250)], diet=DAIRY, allergens=['milk'], section='huevos-lacteos'),
    # ───────────── Platos típicos y preparados (ICBF) ─────────────
    f('ajiaco', 'Ajiaco santafereño', 'prepared', icbf('S001', 82, 6.4, 0.8, 11.3, 2.2),
      measures=[m('1 plato', 450)], diet=MEAT, section='despensa'),
    f('bandeja-paisa', 'Bandeja paisa', 'prepared', icbf('S004', 212, 11.7, 11.0, 15.3, 2.3),
      measures=[m('1 plato', 650)], diet=MEAT, allergens=['egg'], section='despensa'),
    f('sancocho-gallina', 'Sancocho de gallina', 'prepared', icbf('S025', 121, 16.4, 4.0, 4.2, 1.3),
      measures=[m('1 plato', 450)], diet=MEAT, section='despensa'),
    f('tamal-tolimense', 'Tamal tolimense', 'prepared', icbf('S032', 132, 5.7, 3.8, 16.7, 4.0),
      measures=[m('1 unidad', 450)], diet=MEAT, section='despensa'),
    f('mote-queso', 'Mote de queso', 'prepared', icbf('S020', 102, 5.4, 3.9, 10.2, 2.2),
      measures=[m('1 plato', 400)], diet=DAIRY, allergens=['milk'], section='despensa'),
    f('arroz-atollado', 'Arroz atollado', 'prepared', icbf('S002', 119, 10.1, 4.3, 9.2, 1.7),
      measures=[m('1 plato', 350)], diet=MEAT, section='despensa'),
    f('empanada', 'Empanada frita', 'prepared', icbf('S011', 396, 4.7, 26.3, 34.6, 1.1),
      measures=[m('1 unidad', 60)], section='despensa'),
    f('hamburguesa', 'Hamburguesa de res con pan y vegetales', 'prepared', icbf('S017', 252, 11.7, 12.3, 23.1, 1.1),
      measures=[m('1 unidad', 220)], diet=dict(MEAT, gluten=True), allergens=['gluten'], section='despensa'),
    f('pizza-queso', 'Pizza de queso', 'prepared', usda(170373),
      measures=[m('1 porción', 110)], diet=dict(WHEAT, lactose=True), allergens=['gluten', 'milk'], section='despensa'),
    f('guacamole', 'Guacamole', 'prepared', icbf('S016', 184, 0.1, 12.7, 16.3, 1.7),
      measures=[m('1 cucharada', 15)], section='despensa'),
    f('carimanola', 'Carimañola con queso', 'prepared', icbf('S006', 295, 5.8, 17.4, 28.6),
      measures=[m('1 unidad', 80)], diet=DAIRY, allergens=['milk'], section='despensa'),
    f('lechona', 'Lechona tolimense', 'prepared', icbf('S018', 242, 21.8, 12.0, 10.2, 2.9),
      measures=[m('1 porción', 300)], diet=MEAT, section='despensa'),
    f('papas-fritas-paquete', 'Papas fritas de paquete', 'prepared', usda(169677),
      measures=[m('1 paquete pequeño', 28)], section='despensa'),
    f('chips-tortilla', 'Tostitos / nachos', 'prepared', usda(167558),
      measures=[m('1 porción', 28)], section='despensa'),
    f('salsa-tomate-picante', 'Salsa tipo pico de gallo', 'prepared', usda(174524),
      measures=[m('1 cucharada', 16)], section='despensa'),
    f('mostaza', 'Mostaza', 'prepared', usda(172234),
      measures=[m('1 cucharadita', 5)], section='despensa'),
    f('leche-coco', 'Leche de coco (enlatada)', 'beverage', usda(170173),
      measures=[m('1 taza', 225)], section='despensa', cost='medium'),
]


def load_usda(directory):
    wanted = {food['source']['fdc'] for food in FOODS if food['source']['type'] == 'usda'}
    names = {}
    with open(os.path.join(directory, 'food.csv')) as fh:
        for row in csv.DictReader(fh):
            if row['fdc_id'] in wanted:
                names[row['fdc_id']] = row['description']
    values = {fdc: {} for fdc in wanted}
    with open(os.path.join(directory, 'food_nutrient.csv')) as fh:
        for row in csv.DictReader(fh):
            if row['fdc_id'] in wanted and row['nutrient_id'] in NUTRIENTS:
                values[row['fdc_id']][NUTRIENTS[row['nutrient_id']]] = float(row['amount'])
    missing = wanted - set(names)
    if missing:
        raise SystemExit(f'FDC IDs no encontrados: {sorted(missing)}')
    return names, values


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    names, values = load_usda(sys.argv[1])
    ids = set()
    out = []
    for food in FOODS:
        if food['id'] in ids:
            raise SystemExit(f'ID duplicado: {food["id"]}')
        ids.add(food['id'])
        src = food['source']
        if src['type'] == 'icbf':
            v = src['values']
            source = f'ICBF · Tabla de Composición de Alimentos Colombianos 2018 · {src["code"]}'
        else:
            v = values[src['fdc']]
            v = {k: v.get(k, 0.0) for k in ['kcal', 'protein', 'fat', 'carbs', 'fiber']}
            source = f'USDA FoodData Central SR Legacy · FDC {src["fdc"]} ({names[src["fdc"]]})'
        if food['id'] == 'agua-panela':
            source = 'Calculado: 10 % de panela (ICBF K033) en agua'
        diet = food['diet']
        entry = {
            'id': food['id'],
            'name': food['name'],
            'category': food['category'],
            'per100g': {k: round(v[k], 1) for k in ['kcal', 'protein', 'carbs', 'fat', 'fiber']},
            'measures': [{'label': label, 'grams': grams} for label, grams in food['measures']],
            'roles': food['roles'],
            'slots': food['slots'],
            'diet': {'vegetarian': diet['veg'], 'vegan': diet['vegan'], 'lactose': diet['lactose'], 'gluten': diet['gluten']},
            'allergens': food['allergens'],
            'cost': food['cost'],
            'section': food['section'],
            'source': source,
        }
        if food['purchase']:
            entry['purchase'] = food['purchase']
        if food['cooked']:
            entry['cooked'] = food['cooked']
        out.append(entry)

    body = json.dumps(out, ensure_ascii=False, indent=2)
    target = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'seeds', 'foods.data.ts')
    with open(target, 'w') as fh:
        fh.write('// Archivo generado por scripts/build-food-seed.py. No editar a mano.\n')
        fh.write('// Fuentes: ICBF TCAC 2018 y USDA FoodData Central SR Legacy (ver campo `source`).\n')
        fh.write("import type { Food } from '@/domain/types'\n\n")
        fh.write(f'export const FOODS_DATA: Food[] = {body}\n')
    print(f'{len(out)} alimentos escritos en {os.path.normpath(target)}')


if __name__ == '__main__':
    main()
