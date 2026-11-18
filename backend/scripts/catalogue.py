"""National wholesale catalogue: ~600 products built from base product families and their real variants.

Each family has uz/ru/en names, a unit (kg, l, piece, sack, m, t), a plausible wholesale price in UZS,
a 30-day trend, an emoji and search aliases. Variants (cultivars, grades, pack sizes, sizes) derive
their names from the family:

    label "Sante"     -> "Kartoshka (Sante)"            (parenthetical)
    label "+8 mm"     -> "Armatura 8 mm"                (appended)
    label "~Kuraga"   -> "Kuraga"                       (full name)

Variant tuple: (slug_suffix, uz_label, ru_label, en_label, price_multiplier, *extra)
  - slug_suffix "=x" means the full slug is "x", otherwise "<family-slug>-<suffix>"
  - ru/en label None -> same as the uz label
  - extra items: a unit from UNITS (overrides the family unit) or an emoji (overrides the family emoji)

Uzbek is written in Latin script with ASCII apostrophes (the frontend renders o' as oʻ).
"""
from __future__ import annotations

import random
import re
from dataclasses import dataclass, field

UNITS = {"kg", "l", "piece", "sack", "m", "t"}

CATEGORIES = [
    # slug, uz, ru, en, icon
    ("vegetables", "Sabzavotlar", "Овощи", "Vegetables", "carrot"),
    ("fruits", "Mevalar", "Фрукты", "Fruits", "apple"),
    ("dried-fruits-nuts", "Quruq mevalar va yong'oqlar", "Сухофрукты и орехи", "Dried fruits & nuts", "nut"),
    ("grains", "Don, un va yorma", "Зерно, мука и крупы", "Grains, flour & cereals", "wheat"),
    ("meat-dairy", "Go'sht va sut", "Мясо и молочное", "Meat & dairy", "beef"),
    ("oils-grocery", "Yog' va bakaleya", "Масла и бакалея", "Oils & groceries", "shopping-basket"),
    ("beverages", "Ichimliklar", "Напитки", "Beverages", "cup-soda"),
    ("spices", "Ziravorlar", "Специи", "Spices", "leaf"),
    ("construction", "Qurilish materiallari", "Стройматериалы", "Construction", "brick-wall"),
    ("textiles", "To'qimachilik", "Текстиль", "Textiles", "shirt"),
    ("electronics", "Elektronika", "Электроника", "Electronics", "cpu"),
    ("household", "Maishiy kimyo va gigiyena", "Бытовая химия и гигиена", "Household & hygiene", "spray-can"),
    ("other", "Qadoqlash va boshqa", "Упаковка и прочее", "Packaging & other", "package"),
]


@dataclass
class CatProduct:
    slug: str
    category: str
    name_uz: str
    name_ru: str
    name_en: str
    unit: str
    price: float
    trend: float
    emoji: str
    aliases: list[str] = field(default_factory=list)


PRODUCTS: list[CatProduct] = []
_cat = "vegetables"


def _label(family: str, label: str | None) -> str:
    if not label:
        return family
    if label.startswith("~"):
        return label[1:]
    if label.startswith("+"):
        return f"{family} {label[1:]}"
    return f"{family} ({label})"


def _plain(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[(),]", " ", s)).strip().lower()


def fam(slug, uz, ru, en, unit, price, trend, emoji, aliases="", variants=(), base=True, base_label=None):
    """Register a product family. `base_label` = (uz, ru, en) labels for the base product."""
    al = [a.strip() for a in aliases.split(",") if a.strip()]
    if base:
        bl = base_label or (None, None, None)
        base_aliases = list(al)
        if base_label:  # the family name alone ("Qahva", "Coffee") should find the base product
            # skip very short or ambiguous words ("jam" ~ "jami", "pasta" ~ "past/pastga" in Uzbek)
            base_aliases += [x.lower() for x in (uz, ru, en)
                             if len(x) >= 4 and x.lower() not in base_aliases and x.lower() not in {"pasta"}]
        PRODUCTS.append(CatProduct(slug, _cat, _label(uz, bl[0]), _label(ru, bl[1] if bl[1] is not None else bl[0]),
                                   _label(en, bl[2] if bl[2] is not None else bl[0]), unit, price, trend, emoji, base_aliases))
    for v in variants:
        sfx, luz, lru, len_, mult, *extra = v
        vunit, vemoji = unit, emoji
        for x in extra:
            if x in UNITS:
                vunit = x
            else:
                vemoji = x
        vslug = sfx[1:] if sfx.startswith("=") else f"{slug}-{sfx}"
        n_uz = _label(uz, luz)
        n_ru = _label(ru, lru if lru is not None else luz)
        n_en = _label(en, len_ if len_ is not None else luz)
        jitter = random.Random(vslug).uniform(-0.035, 0.035)
        valiases = [_plain(n_uz), _plain(n_en)]
        if not base and not valiases[0].startswith(_plain(uz)):
            valiases += al
        PRODUCTS.append(CatProduct(vslug, _cat, n_uz, n_ru, n_en, vunit, price * mult, round(trend + jitter, 3), vemoji, valiases))


def one(slug, uz, ru, en, unit, price, trend, emoji, aliases=""):
    fam(slug, uz, ru, en, unit, price, trend, emoji, aliases)


def cat(slug: str) -> None:
    global _cat
    _cat = slug


# =================================================================== vegetables (~70)
cat("vegetables")
fam("kartoshka", "Kartoshka", "Картофель", "Potato", "kg", 4800, 0.07, "🥔", "картошка, kartofel, potatoes, kartoshka", [
    ("sante", "Sante", "Санте", "Sante", 1.04),
    ("gala", "Gala", "Гала", "Gala", 1.06),
    ("red-scarlett", "Red Scarlett", "Ред Скарлетт", "Red Scarlett", 1.10),
    ("picasso", "Picasso", "Пикассо", "Picasso", 1.05),
    ("arizona", "Arizona", "Аризона", "Arizona", 1.03),
    ("yangi", "yangi hosil", "молодой", "new crop", 1.35),
    ("urugli", "urug'lik", "семенной", "seed", 1.25),
])
fam("piyoz", "Piyoz", "Лук репчатый", "Onion", "kg", 3200, -0.10, "🧅", "лук, onions, piyoz", [
    ("qizil", "qizil", "красный", "red", 1.25),
    ("oq", "oq", "белый", "white", 1.30),
    ("shirin", "shirin, Yalta", "сладкий, ялтинский", "sweet, Yalta", 1.9),
    ("qop", "50 kg qop", "мешок 50 кг", "50 kg sack", 47, "sack"),
])
fam("sabzi", "Sabzi", "Морковь", "Carrot", "kg", 3800, 0.03, "🥕", "морковка, carrots", [
    ("sariq", "sariq, Mirzoi", "жёлтая, Мирзои", "yellow, Mirzoi", 1.35),
    ("qizil", "qizil", "красная", "red", 1.05),
    ("yuvilgan", "yuvilgan", "мытая", "washed", 1.2),
    ("qop", "50 kg qop", "мешок 50 кг", "50 kg sack", 46, "sack"),
])
fam("pomidor", "Pomidor", "Помидоры", "Tomato", "kg", 13000, 0.18, "🍅", "томат, томаты, tomatoes, pamidor", [
    ("pushti", "pushti", "розовые", "pink", 1.2),
    ("qizil", "qizil", "красные", "red", 1.0),
    ("cherry", "cherry", "черри", "cherry", 2.1),
    ("issiqxona", "issiqxona", "тепличные", "greenhouse", 1.15),
    ("slivka", "slivka", "сливка", "plum", 0.95),
    ("tuzlash", "tuzlash uchun, mayda", "мелкие, для засолки", "small, for pickling", 0.7),
])
fam("bodring", "Bodring", "Огурцы", "Cucumber", "kg", 9500, 0.09, "🥒", "огурец, cucumbers", [
    ("issiqxona", "issiqxona", "тепличные", "greenhouse", 1.12),
    ("kornishon", "kornishon", "корнишоны", "gherkins", 1.4),
    ("uzun", "uzun mevali", "длинноплодные", "long", 1.2),
])
fam("karam", "Oq karam", "Капуста белокочанная", "White cabbage", "kg", 3000, -0.04, "🥬", "капуста, cabbage, karam", [
    ("qizil", "~Qizil karam", "~Капуста краснокочанная", "~Red cabbage", 1.9),
    ("pekin", "~Pekin karami", "~Пекинская капуста", "~Napa cabbage", 2.6),
    ("yosh", "yangi hosil", "молодая", "early", 1.4),
])
one("gulkaram", "Gulkaram", "Цветная капуста", "Cauliflower", "kg", 11000, 0.02, "🥦", "цветная капуста, cauliflower")
one("brokkoli", "Brokkoli", "Брокколи", "Broccoli", "kg", 19000, 0.01, "🥦", "брокколи, broccoli")
fam("sarimsoq", "Sarimsoq", "Чеснок", "Garlic", "kg", 26000, 0.05, "🧄", "чеснок, garlic", [
    ("yangi", "yangi hosil", "молодой", "new crop", 0.85),
    ("xitoy", "Xitoy", "китайский", "Chinese", 0.9),
])
fam("bolgar-qalampir", "Bolgar qalampiri", "Болгарский перец", "Bell pepper", "kg", 14000, -0.06, "🫑", "перец, qalampir, pepper", [
    ("qizil", "qizil", "красный", "red", 1.1),
    ("sariq", "sariq", "жёлтый", "yellow", 1.2),
    ("yashil", "yashil", "зелёный", "green", 0.85),
])
fam("achchiq-qalampir", "Achchiq qalampir", "Острый перец", "Chili pepper", "kg", 18000, 0.04, "🌶️", "острый перец, chili", [
    ("quritilgan", "quritilgan", "сушёный", "dried", 3.2),
])
one("baqlajon", "Baqlajon", "Баклажаны", "Eggplant", "kg", 8000, -0.05, "🍆", "баклажан, eggplant, aubergine")
one("qovoqcha", "Qovoqcha", "Кабачки", "Zucchini", "kg", 6000, -0.07, "🥒", "кабачок, zucchini, courgette")
fam("oshqovoq", "Oshqovoq", "Тыква", "Pumpkin", "kg", 3500, 0.02, "🎃", "тыква, pumpkin, qovoq", [
    ("muskat", "muskat", "мускатная", "butternut", 1.5),
])
one("lavlagi", "Lavlagi", "Свёкла", "Beetroot", "kg", 3500, 0.03, "🍠", "свекла, beet, beets")
fam("turp", "Turp", "Редька", "Radish", "kg", 4000, 0.01, "🥕", "редька, turp", [
    ("dayqon", "~Oq turp (daykon)", "~Дайкон", "~Daikon radish", 1.2),
    ("rediska", "~Rediska", "~Редис", "~Red radish", 2.4),
])
one("kashnich", "Kashnich (ko'k)", "Кинза", "Coriander (fresh)", "kg", 18000, 0.06, "🌿", "кинза, coriander, cilantro")
one("shivit", "Shivit (ukrop)", "Укроп", "Dill", "kg", 17000, 0.05, "🌿", "укроп, dill, ukrop")
one("petrushka", "Petrushka", "Петрушка", "Parsley", "kg", 19000, 0.04, "🌿", "петрушка, parsley")
one("rayhon", "Rayhon", "Базилик", "Basil", "kg", 24000, 0.02, "🌿", "базилик, basil, reyhan")
one("yalpiz", "Yalpiz", "Мята", "Mint", "kg", 22000, 0.03, "🌿", "мята, mint")
one("kok-piyoz", "Ko'k piyoz", "Зелёный лук", "Green onion", "kg", 15000, 0.08, "🌱", "зеленый лук, spring onion")
one("salat-bargi", "Salat bargi", "Листовой салат", "Lettuce", "kg", 20000, 0.01, "🥬", "салат, lettuce")
one("ismaloq", "Ismaloq", "Шпинат", "Spinach", "kg", 18000, -0.02, "🥬", "шпинат, spinach")
one("otquloq", "Otquloq", "Щавель", "Sorrel", "kg", 16000, 0.00, "🥬", "щавель, sorrel")
one("selderey", "Selderey", "Сельдерей", "Celery", "kg", 20000, 0.02, "🥬", "сельдерей, celery")
one("makkajoxori", "Makkajo'xori (so'tali)", "Кукуруза в початках", "Sweet corn (cobs)", "piece", 2500, 0.05, "🌽", "кукуруза, corn, makkajoxori")
fam("qoziqorin", "Qo'ziqorin", "Грибы", "Mushrooms", "kg", 35000, 0.01, "🍄", "грибы, mushrooms, shampinon",
    [("veshenka", "veshenka", "вешенка", "oyster", 0.9)], base_label=("shampinon", "шампиньоны", "button"))
one("batat", "Batat", "Батат", "Sweet potato", "kg", 15000, 0.03, "🍠", "батат, sweet potato")
one("zanjabil", "Zanjabil (yangi)", "Имбирь свежий", "Fresh ginger", "kg", 45000, 0.06, "🫚", "имбирь, ginger, imbir")
one("yashil-loviya", "Yashil loviya", "Стручковая фасоль", "Green beans", "kg", 18000, 0.02, "🫛", "стручковая фасоль, green beans")
one("kok-noxat", "Ko'k no'xat", "Зелёный горошек", "Green peas", "kg", 20000, 0.03, "🫛", "горошек, green peas")
one("por-piyoz", "Por piyoz", "Лук-порей", "Leek", "kg", 15000, 0.00, "🧅", "лук порей, leek")

# =================================================================== fruits (~60)
cat("fruits")
fam("olma", "Olma", "Яблоки", "Apple", "kg", 11000, 0.02, "🍎", "яблоко, apples", [
    ("golden", "Golden", "Голден", "Golden", 1.1, "🍏"),
    ("semerenko", "Semerenko", "Семеренко", "Semerenko", 1.05, "🍏"),
    ("fuji", "Fuji", "Фуджи", "Fuji", 1.3),
    ("gala", "Gala", "Гала", "Gala", 1.2),
    ("qizil", "qizil, Red Delicious", "красные, Ред Делишес", "Red Delicious", 1.15),
    ("granny-smith", "Granny Smith", "Гренни Смит", "Granny Smith", 1.35, "🍏"),
])
fam("nok", "Nok", "Груши", "Pear", "kg", 14000, 0.03, "🍐", "груша, pears", [
    ("konferens", "Konferens", "Конференция", "Conference", 1.2),
    ("xitoy", "Xitoy", "китайская", "Chinese", 1.1),
])
fam("shaftoli", "Shaftoli", "Персики", "Peach", "kg", 15000, -0.06, "🍑", "персик, peaches", [
    ("anjir", "~Anjir shaftoli", "~Персик инжирный", "~Flat peach", 1.3),
    ("nektarin", "~Nektarin", "~Нектарин", "~Nectarine", 1.2),
])
fam("orik", "O'rik", "Абрикосы", "Apricot", "kg", 14000, -0.08, "🍑", "абрикос, apricots, orik", [
    ("subhoniy", "Subhoniy", "Субхони", "Subhoni", 1.15),
    ("isfarak", "Isfarak", "Исфарак", "Isfarak", 1.1),
])
fam("gilos", "Gilos", "Черешня", "Sweet cherry", "kg", 28000, -0.10, "🍒", "черешня, cherries", [
    ("napoleon", "Napoleon", "Наполеон", "Napoleon", 1.1),
    ("qora", "qora", "чёрная", "black", 1.15),
])
one("olcha", "Olcha", "Вишня", "Sour cherry", "kg", 22000, -0.05, "🍒", "вишня, sour cherries")
fam("olxori", "Olxo'ri", "Слива", "Plum", "kg", 13000, -0.04, "🫐", "слива, plums, olxori", [
    ("vengerka", "Vengerka", "Венгерка", "Hungarian", 1.1),
])
fam("qulupnay", "Qulupnay", "Клубника", "Strawberry", "kg", 30000, -0.12, "🍓", "клубника, strawberries", [
    ("issiqxona", "issiqxona", "тепличная", "greenhouse", 1.4),
])
one("malina", "Malina", "Малина", "Raspberry", "kg", 45000, -0.03, "🫐", "малина, raspberries")
one("qoraqat", "Qoraqat", "Чёрная смородина", "Blackcurrant", "kg", 32000, 0.01, "🫐", "смородина, currant")
fam("uzum", "Uzum", "Виноград", "Grapes", "kg", 16000, -0.08, "🍇", "grape, виноград", [
    ("husayni", "Husayni", "Хусайни", "Husayni", 1.25),
    ("kishmish", "Kishmish", "Кишмиш", "Kishmish", 1.1),
    ("toyfi", "Toyfi", "Тайфи", "Taifi", 1.2),
    ("qora", "qora", "чёрный", "black", 1.05),
    ("rizamat", "Rizamat", "Ризамат", "Rizamat", 1.3),
    ("nimrang", "Nimrang", "Нимранг", "Nimrang", 1.15),
])
fam("qovun", "Qovun", "Дыня", "Melon", "kg", 6000, -0.06, "🍈", "дыня, melons", [
    ("mirzachul", "Mirzachul, Torpeda", "мирзачульская, Торпеда", "Mirzachul torpedo", 1.15),
    ("gulobi", "Gulobi", "Гуляби", "Gulyabi", 1.3),
    ("ich-qizil", "Ich-qizil", "Ич-кизил", "Ich-kizil", 1.1),
    ("amiri", "Amiri", "Амири", "Amiri", 1.2),
    ("zard", "Zard", "Зард", "Zard", 1.05),
])
one("tarvuz", "Tarvuz", "Арбуз", "Watermelon", "kg", 3500, -0.09, "🍉", "арбуз, watermelons")
fam("anor", "Anor", "Гранат", "Pomegranate", "kg", 18000, 0.04, "🍎", "гранаты, pomegranates", [
    ("qozoqi", "Qozoqi", "Казаки", "Kazake", 1.2),
])
one("xurmo", "Xurmo", "Хурма", "Persimmon", "kg", 14000, 0.05, "🍊", "хурма, persimmons")
one("anjir", "Anjir", "Инжир", "Fig", "kg", 26000, -0.02, "🫐", "инжир, figs")
one("behi", "Behi", "Айва", "Quince", "kg", 12000, 0.02, "🍐", "айва, quince")
fam("limon", "Limon", "Лимоны", "Lemon", "kg", 32000, -0.07, "🍋", "лимон, lemons", [
    ("turkiya", "Turkiya", "Турция", "Turkey", 0.95),
    ("toshkent", "Toshkent limoni", "ташкентский", "Tashkent", 1.25),
])
fam("apelsin", "Apelsin", "Апельсины", "Orange", "kg", 22000, 0.03, "🍊", "апельсин, oranges", [
    ("misr", "Misr", "Египет", "Egypt", 0.95),
    ("navel", "Navel", "Навел", "Navel", 1.15),
])
fam("mandarin", "Mandarin", "Мандарины", "Mandarin", "kg", 21000, 0.06, "🍊", "мандарин, tangerines, mandarins", [
    ("pokiston", "Pokiston", "Пакистан", "Pakistan", 0.9),
])
fam("banan", "Banan", "Бананы", "Banana", "kg", 21000, 0.01, "🍌", "банан, bananas", [
    ("ekvador", "Ekvador", "Эквадор", "Ecuador", 1.08),
])
one("kivi", "Kivi", "Киви", "Kiwi", "kg", 26000, 0.02, "🥝", "киви, kiwifruit")
one("ananas", "Ananas", "Ананас", "Pineapple", "piece", 38000, 0.01, "🍍", "ананас, pineapple")
one("mango", "Mango", "Манго", "Mango", "kg", 55000, -0.02, "🥭", "манго, mangoes")
one("kokos", "Kokos", "Кокос", "Coconut", "piece", 22000, 0.00, "🥥", "кокос, coconut")
one("avokado", "Avokado", "Авокадо", "Avocado", "kg", 60000, 0.03, "🥑", "авокадо, avocado")
one("tut", "Tut", "Шелковица", "Mulberry", "kg", 15000, -0.04, "🫐", "тутовник, mulberries")

# =================================================================== dried fruits & nuts (~40)
cat("dried-fruits-nuts")
fam("mayiz", "Mayiz", "Изюм", "Raisins", "kg", 38000, 0.03, "🍇", "изюм, raisins, kishmish", [
    ("qora", "qora", "чёрный", "black", 0.95),
    ("soyagi", "Soyagi", "Сояги", "Soyagi", 1.1),
    ("sabza", "Sabza", "Сабза", "Sabza", 1.05),
    ("germiyon", "Germiyon", "Гермиан", "Germian", 1.15),
    ("avlon", "Avlon", "Авлон", "Avlon", 1.0),
], base_label=("oq kishmish", "белый кишмиш", "white sultana"))
fam("orik-qoqi", "O'rik qoqi", "Курага", "Dried apricots", "kg", 48000, 0.02, "🍑", "курага, dried apricot", [
    ("turshak", "~Turshak (danakli o'rik)", "~Урюк", "~Uryuk (whole dried apricots)", 0.8),
    ("subhoniy", "Subhoniy", "Субхони", "Subhoni", 1.2),
])
fam("olxori-qoqi", "Olxo'ri qoqi", "Чернослив", "Prunes", "kg", 42000, 0.01, "🫐", "чернослив, prunes", [
    ("danaksiz", "danaksiz", "без косточки", "pitted", 1.2),
])
one("anjir-qoqi", "Anjir qoqi", "Инжир сушёный", "Dried figs", "kg", 65000, 0.02, "🫐", "сушеный инжир, dried figs")
fam("finik", "Finik xurmosi", "Финики", "Dates", "kg", 40000, 0.04, "🌴", "финики, dates, finik", [
    ("medjul", "Medjul", "Меджул", "Medjool", 2.2),
    ("ajva", "Ajva", "Аджва", "Ajwa", 2.6),
])
one("olma-qoqi", "Olma qoqi", "Сушёные яблоки", "Dried apples", "kg", 30000, 0.00, "🍎", "сушеные яблоки, dried apples")
one("qovun-qoqi", "Qovun qoqi", "Сушёная дыня", "Dried melon", "kg", 55000, 0.01, "🍈", "сушеная дыня, dried melon")
one("olcha-qoqi", "Olcha qoqi", "Сушёная вишня", "Dried sour cherries", "kg", 70000, 0.02, "🍒", "сушеная вишня")
one("aralash-qoqi", "Quruq mevalar aralashmasi", "Ассорти сухофруктов", "Mixed dried fruits", "kg", 45000, 0.01, "🍑", "сухофрукты, dried fruit mix")
fam("yongoq", "Yong'oq", "Грецкий орех", "Walnut", "kg", 30000, 0.04, "🌰", "грецкий орех, walnuts, yongoq", [
    ("magiz", "mag'iz", "ядро", "kernels", 2.6),
    ("magiz-oq", "mag'iz, oq (premium)", "ядро светлое, премиум", "light kernels, premium", 3.1),
    ("qogoz", "qog'oz po'choq", "бумажная скорлупа", "paper shell", 1.25),
], base_label=("po'choqli", "в скорлупе", "in shell"))
fam("bodom", "Bodom", "Миндаль", "Almond", "kg", 55000, 0.03, "🌰", "миндаль, almonds", [
    ("magiz", "mag'iz", "ядро", "kernels", 2.0),
    ("qovurilgan", "mag'iz, qovurilgan", "ядро жареное", "roasted kernels", 2.3),
], base_label=("po'choqli", "в скорлупе", "in shell"))
fam("pista", "Pista", "Фисташки", "Pistachios", "kg", 140000, 0.02, "🥜", "фисташки, pistachio", [
    ("tuzlangan", "tuzlangan", "солёные", "salted", 1.08),
])
fam("yeryongoq", "Yeryong'oq", "Арахис", "Peanuts", "kg", 26000, 0.02, "🥜", "арахис, peanut", [
    ("qovurilgan", "qovurilgan", "жареный", "roasted", 1.25),
    ("tozalangan", "tozalangan", "очищенный", "shelled", 1.15),
])
fam("funduk", "Funduk", "Фундук", "Hazelnuts", "kg", 75000, 0.01, "🌰", "фундук, hazelnut", [
    ("magiz", "mag'iz", "ядро", "kernels", 1.9),
])
one("keshyu", "Keshyu", "Кешью", "Cashews", "kg", 160000, 0.02, "🥜", "кешью, cashew")
fam("kungaboqar-urugi", "Kungaboqar urug'i", "Семечки подсолнечника", "Sunflower seeds", "kg", 18000, 0.03, "🌻", "семечки, sunflower seeds, semechki", [
    ("qovurilgan", "qovurilgan", "жареные", "roasted", 1.4),
])
one("qovoq-urugi", "Qovoq urug'i", "Тыквенные семечки", "Pumpkin seeds", "kg", 45000, 0.02, "🎃", "тыквенные семечки, pumpkin seeds")
fam("danak", "Danak mag'zi", "Абрикосовые косточки", "Apricot kernels", "kg", 60000, 0.03, "🌰", "абрикосовая косточка, danak", [
    ("tuzlangan", "~Shirin danak (tuzlangan)", "~Сладкие косточки (солёные)", "~Sweet apricot kernels (salted)", 1.3),
])
one("kedr-yongogi", "Kedr yong'og'i", "Кедровый орех", "Pine nuts", "kg", 260000, 0.04, "🌲", "кедровый орех, pine nuts")

# =================================================================== grains, flour & cereals (~50)
cat("grains")
fam("bugdoy", "Bug'doy", "Пшеница", "Wheat", "kg", 3900, 0.02, "🌾", "bugdoy, пшеницу, wheat", [
    ("qattiq", "qattiq, durum", "твёрдая, дурум", "durum", 1.25),
    ("3-sinf", "3-sinf", "3 класс", "class 3", 0.97),
    ("urugli", "urug'lik", "семенная", "seed", 1.3),
    ("tonna", "tonna", "тонна", "per tonne", 950, "t"),
])
fam("un", "Un", "Мука", "Flour", "kg", 5600, 0.04, "🌾", "мука, flour, un", [
    ("oliy", "oliy nav", "высший сорт", "premium grade", 1.15),
    ("2-nav", "2-nav", "2 сорт", "2nd grade", 0.88),
    ("oliy-qop", "oliy nav, 50 kg qop", "высший сорт, мешок 50 кг", "premium grade, 50 kg sack", 55, "sack"),
    ("1-nav-qop", "1-nav, 50 kg qop", "1 сорт, мешок 50 кг", "1st grade, 50 kg sack", 48, "sack"),
    ("javdar", "~Javdar uni", "~Мука ржаная", "~Rye flour", 1.3),
    ("makkajoxori", "~Makkajo'xori uni", "~Мука кукурузная", "~Corn flour", 1.4),
    ("toliq-donli", "~To'liq donli un", "~Мука цельнозерновая", "~Whole wheat flour", 1.35),
    ("guruch", "~Guruch uni", "~Мука рисовая", "~Rice flour", 2.6),
], base_label=("1-nav", "1 сорт", "1st grade"))
fam("guruch", "Guruch", "Рис", "Rice", "kg", 29000, 0.05, "🍚", "рис, rice, devzira, guruch", [
    ("devzira-qizil", "Devzira, qizil", "девзира красная", "red devzira", 1.08),
    ("lazer", "Lazer", "Лазер", "Lazer", 0.6),
    ("alanga", "Alanga", "Аланга", "Alanga", 0.72),
    ("chungara", "Chungara", "Чунгара", "Chungara", 0.95),
    ("bosmati", "Bosmati", "басмати", "basmati", 1.05),
    ("iskandar", "Iskandar", "Искандер", "Iskandar", 0.68),
    ("jasmin", "Jasmin", "жасмин", "jasmine", 1.0),
    ("dumaloq", "dumaloq, Krasnodar", "круглый, краснодарский", "round grain", 0.55),
    ("lazer-qop", "Lazer, 25 kg qop", "Лазер, мешок 25 кг", "Lazer, 25 kg sack", 14.4, "sack"),
], base_label=("Devzira", "девзира", "devzira"))
one("mosh", "Mosh", "Маш", "Mung bean", "kg", 17000, 0.06, "🫘", "маш, mung")
fam("noxat", "No'xat", "Нут", "Chickpeas", "kg", 16000, 0.03, "🫘", "нут, chickpea, noxat", [
    ("yirik", "yirik", "крупный", "large", 1.2),
    ("mayda", "mayda", "мелкий", "small", 0.85),
])
fam("loviya", "Loviya", "Фасоль", "Beans", "kg", 19000, 0.02, "🫘", "фасоль, beans, loviya", [
    ("qizil", "qizil", "красная", "red", 1.1),
    ("ola", "ola, rang-barang", "пёстрая", "pinto", 1.05),
], base_label=("oq", "белая", "white"))
fam("yasmiq", "Yasmiq", "Чечевица", "Lentils", "kg", 18000, 0.01, "🫘", "чечевица, lentils", [
    ("yashil", "yashil", "зелёная", "green", 1.1),
], base_label=("qizil", "красная", "red"))
one("maydalangan-noxat", "Maydalangan no'xat", "Горох колотый", "Split peas", "kg", 9000, 0.01, "🫛", "горох, split peas")
one("grechka", "Grechka", "Гречка", "Buckwheat", "kg", 16000, 0.03, "🥣", "гречка, buckwheat")
fam("suli", "Suli", "Овёс", "Oats", "kg", 6000, 0.01, "🥣", "овес, oats", [
    ("gerkules", "~Suli yormasi (gerkules)", "~Овсяные хлопья (геркулес)", "~Rolled oats", 2.2),
], base_label=("doni", "зерно", "grain"))
fam("arpa", "Arpa", "Ячмень", "Barley", "kg", 3600, 0.02, "🌾", "ячмень, barley", [
    ("perlovka", "~Arpa yormasi (perlovka)", "~Перловка", "~Pearl barley", 2.3, "🥣"),
])
fam("makkajoxori-doni", "Makkajo'xori doni", "Кукуруза зерно", "Corn grain", "kg", 3800, 0.03, "🌽", "кукуруза зерно, maize", [
    ("yorma", "~Makkajo'xori yormasi", "~Кукурузная крупа", "~Corn grits", 2.1),
])
one("tariq", "Tariq yormasi", "Пшено", "Millet groats", "kg", 9000, 0.01, "🌾", "пшено, tariq")
one("manniy", "Manniy yorma", "Манная крупа", "Semolina", "kg", 9500, 0.02, "🥣", "манка, semolina")
one("kepak", "Kepak", "Отруби", "Wheat bran", "kg", 2200, 0.03, "🌾", "отруби, bran")
one("joxori", "Jo'xori", "Сорго", "Sorghum", "kg", 4200, 0.01, "🌾", "сорго, sorghum")
one("sholi", "Sholi", "Рис-сырец (шали)", "Paddy rice", "kg", 9000, 0.04, "🌾", "шали, paddy")
one("omixta-yem", "Omixta yem", "Комбикорм", "Compound feed", "kg", 4500, 0.02, "🌾", "комбикорм, feed")
one("bulgur", "Bug'doy yormasi (bulgur)", "Булгур", "Bulgur", "kg", 12000, 0.02, "🥣", "булгур, bulgur")
one("zigir-urugi", "Zig'ir urug'i", "Семена льна", "Flax seeds", "kg", 22000, 0.01, "🌾", "лен, flax")
one("javdar", "Javdar", "Рожь", "Rye", "kg", 4000, 0.01, "🌾", "рожь, rye")

# =================================================================== meat & dairy (~60)
cat("meat-dairy")
fam("mol-goshti", "Mol go'shti", "Говядина", "Beef", "kg", 112000, 0.03, "🥩", "говядина, beef, mol goshti", [
    ("lahm", "lahm, suyaksiz", "мякоть без кости", "boneless", 1.2),
    ("son", "son qismi", "задняя часть", "hindquarter", 1.08),
    ("tosh", "to'sh", "грудинка", "brisket", 0.92),
    ("qovurga", "qovurg'a", "рёбра", "ribs", 0.85),
    ("qiyma", "qiyma", "фарш", "minced", 1.05),
    ("jigar", "jigar", "печень", "liver", 0.6),
    ("til", "til", "язык", "tongue", 1.15),
    ("muzlatilgan", "muzlatilgan, import", "замороженная, импорт", "frozen, imported", 0.82),
])
fam("qoy-goshti", "Qo'y go'shti", "Баранина", "Mutton", "kg", 128000, 0.02, "🍖", "баранина, mutton, qoy goshti", [
    ("lahm", "lahm", "мякоть", "boneless", 1.15),
    ("son", "son", "окорок", "leg", 1.08),
    ("qovurga", "qovurg'a", "рёбра", "ribs", 0.9),
    ("qiyma", "qiyma", "фарш", "minced", 1.0),
    ("dumba", "~Dumba yog'i", "~Курдючный жир", "~Fat-tail fat", 0.55),
])
fam("ot-goshti", "Ot go'shti", "Конина", "Horse meat", "kg", 120000, 0.02, "🍖", "конина, horse meat", [
    ("qazi", "~Qazi", "~Казы", "~Kazy (horse sausage)", 1.9, "🌭"),
])
fam("tovuq", "Tovuq go'shti", "Курица", "Chicken", "kg", 38000, -0.02, "🍗", "курица, chicken, tovuq", [
    ("son", "son", "окорочка", "legs", 1.05),
    ("file", "file", "филе", "breast fillet", 1.45),
    ("qanot", "qanot", "крылья", "wings", 0.95),
    ("broyler", "broyler, muzlatilgan", "бройлер, заморож.", "frozen broiler", 0.85),
    ("jigar", "~Tovuq jigari", "~Куриная печень", "~Chicken liver", 0.75),
])
one("kurka", "Kurka go'shti", "Индейка", "Turkey", "kg", 72000, 0.01, "🦃", "индейка, turkey")
one("bedana-tuxumi", "Bedana tuxumi", "Перепелиные яйца", "Quail eggs", "piece", 900, 0.02, "🥚", "перепелиные яйца, quail eggs")
fam("tuxum", "Tuxum", "Яйца", "Eggs", "piece", 1350, 0.06, "🥚", "яйцо, egg, eggs", [
    ("c0", "C0, yirik", "С0, отборные", "C0, extra", 1.18),
    ("c1", "C1", "С1", "C1", 1.05),
    ("c2", "C2", "С2", "C2", 0.92),
    ("lotok", "30 donalik lotok", "лоток 30 шт", "tray of 30", 29),
])
fam("sut", "Sut", "Молоко", "Milk", "l", 11000, 0.01, "🥛", "молоко, milk", [
    ("2-5", "2.5%", "2,5%", "2.5%", 0.95),
    ("3-2", "3.2%", "3,2%", "3.2%", 1.05),
    ("6", "6%", "6%", "6%", 1.2),
    ("xom", "xom, fermadan", "сырое, с фермы", "raw, farm", 0.8),
])
one("qatiq", "Qatiq", "Катык", "Katyk (yogurt drink)", "l", 12000, 0.02, "🥛", "катык, katyk, yogurt")
one("kefir", "Kefir", "Кефир", "Kefir", "l", 12500, 0.02, "🥛", "кефир, kefir")
one("ayron", "Ayron", "Айран", "Ayran", "l", 9000, 0.01, "🥛", "айран, ayran")
one("suzma", "Suzma", "Сузьма", "Suzma (strained yogurt)", "kg", 32000, 0.03, "🥛", "сузьма, suzma")
fam("qaymoq", "Qaymoq", "Сметана", "Sour cream", "kg", 38000, 0.02, "🥛", "сметана, sour cream, qaymoq", [
    ("bozor", "~Bozor qaymog'i", "~Каймак", "~Kaymak (clotted cream)", 1.9),
])
one("tvorog", "Tvorog", "Творог", "Cottage cheese", "kg", 42000, 0.02, "🧀", "творог, cottage cheese")
fam("pishloq", "Pishloq", "Сыр", "Cheese", "kg", 95000, 0.02, "🧀", "сыр, cheese", [
    ("gollandskiy", "Gollandskiy", "Голландский", "Dutch", 1.05),
    ("mozzarella", "Mozzarella", "Моцарелла", "Mozzarella", 1.25),
    ("brinza", "~Brinza", "~Брынза", "~Brynza (feta-style)", 0.75),
    ("eritilgan", "eritilgan", "плавленый", "processed", 0.7),
], base_label=("Rossiyskiy", "Российский", "Rossiysky"))
one("qurt", "Qurt", "Курт", "Kurt (dried yogurt balls)", "kg", 60000, 0.03, "🧀", "курт, qurt")
one("sariyog", "Sariyog'", "Сливочное масло", "Butter", "kg", 95000, 0.03, "🧈", "масло сливочное, butter, sariyog")
fam("muzqaymoq", "Muzqaymoq", "Мороженое", "Ice cream", "kg", 45000, 0.01, "🍦", "мороженое, ice cream", [
    ("plombir", "plombir", "пломбир", "plombir", 1.2),
])
fam("kolbasa", "Kolbasa", "Колбаса", "Sausage", "kg", 65000, 0.02, "🌭", "колбаса, sausage", [
    ("dudlangan", "dudlangan", "копчёная", "smoked", 1.45),
    ("sosiska", "~Sosiska", "~Сосиски", "~Frankfurters", 0.85),
], base_label=("qaynatilgan", "варёная", "boiled"))
fam("baliq", "Baliq", "Рыба", "Fish", "kg", 38000, 0.02, "🐟", "рыба, fish, baliq", [
    ("=karp", "~Zog'ora baliq (karp)", "~Карп", "~Carp", 1.0),
    ("=laqqa", "~Laqqa baliq", "~Сом", "~Catfish", 1.35),
    ("=oq-amur", "~Oq amur", "~Белый амур", "~Grass carp", 1.05),
    ("=skumbriya", "~Skumbriya (muzlatilgan)", "~Скумбрия мороженая", "~Frozen mackerel", 1.2),
    ("=seld", "~Seld (tuzlangan)", "~Сельдь солёная", "~Salted herring", 1.1),
    ("=forel", "~Forel baliq", "~Форель", "~Trout", 2.6),
], base=False)

# =================================================================== oils & groceries (~58)
cat("oils-grocery")
fam("kungaboqar-yogi", "Kungaboqar yog'i", "Подсолнечное масло", "Sunflower oil", "l", 21500, 0.03, "🌻", "подсолнечное масло, sunflower oil, yog", [
    ("5l", "tozalangan, 5 l", "рафинированное, 5 л", "refined, 5 l", 0.96),
    ("xom", "tozalanmagan", "нерафинированное", "unrefined", 1.05),
    ("quyma", "quyma, bochkada", "наливом, в бочках", "bulk, in drums", 0.88),
])
fam("paxta-yogi", "Paxta yog'i", "Хлопковое масло", "Cottonseed oil", "l", 23000, 0.02, "🫗", "хлопковое масло, cottonseed oil", [
    ("5l", "5 l", "5 л", "5 l", 0.97),
    ("quyma", "quyma", "наливом", "bulk", 0.9),
])
fam("zaytun-yogi", "Zaytun yog'i", "Оливковое масло", "Olive oil", "l", 120000, 0.03, "🫒", "оливковое масло, olive oil", [
    ("extra", "Extra Virgin", "Extra Virgin", "extra virgin", 1.3),
])
one("makkajoxori-yogi", "Makkajo'xori yog'i", "Кукурузное масло", "Corn oil", "l", 28000, 0.02, "🌽", "кукурузное масло, corn oil")
one("margarin", "Margarin", "Маргарин", "Margarine", "kg", 26000, 0.01, "🧈", "маргарин, margarine")
fam("shakar", "Shakar", "Сахар", "Sugar", "kg", 13500, -0.03, "🍬", "сахар, sugar", [
    ("qop", "50 kg qop", "мешок 50 кг", "50 kg sack", 47, "sack"),
    ("qand", "~Qand (bo'lak shakar)", "~Сахар-рафинад", "~Sugar cubes", 1.4),
    ("jigarrang", "jigarrang", "тростниковый", "brown cane", 2.2),
], base_label=("oq", "белый", "white"))
one("navvot", "Navvot", "Наввот (кристаллический сахар)", "Navvot (rock sugar)", "kg", 30000, 0.01, "🍬", "наввот, rock sugar")
fam("tuz", "Osh tuzi", "Соль поваренная", "Table salt", "kg", 2500, 0.01, "🧂", "соль, salt, tuz", [
    ("dagal", "dag'al", "крупная", "coarse", 0.85),
    ("qop", "50 kg qop", "мешок 50 кг", "50 kg sack", 40, "sack"),
    ("dengiz", "~Dengiz tuzi", "~Морская соль", "~Sea salt", 3.0),
], base_label=("yodlangan", "йодированная", "iodized"))
fam("makaron", "Makaron", "Макароны", "Pasta", "kg", 12000, 0.02, "🍝", "макароны, macaroni", [
    ("spagetti", "~Spagetti", "~Спагетти", "~Spaghetti", 1.1),
    ("vermishel", "~Vermishel", "~Вермишель", "~Vermicelli", 0.95, "🍜"),
    ("lagmon", "~Lag'mon (cho'zma)", "~Лагман (тянутая лапша)", "~Lagman noodles", 1.3, "🍜"),
    ("lapsha", "~Lapsha", "~Лапша", "~Egg noodles", 1.05, "🍜"),
], base_label=("shoxcha", "рожки", "elbows"))
fam("non", "Non", "Лепёшка", "Flatbread", "piece", 4000, 0.03, "🫓", "лепешка, non, bread", [
    ("patir", "~Patir non", "~Патыр", "~Patir flatbread", 2.0),
    ("lavash", "~Lavash", "~Лаваш", "~Lavash", 0.8),
    ("buxanka", "~Qolip non (buxanka)", "~Хлеб формовой", "~Tin loaf", 1.0, "🍞"),
    ("baton", "~Baton", "~Батон", "~White loaf", 1.1, "🥖"),
], base_label=("obi non", "оби нон", "obi non"))
fam("tomat-pasta", "Tomat pastasi", "Томатная паста", "Tomato paste", "kg", 22000, 0.04, "🥫", "томатная паста, tomato paste", [
    ("banka", "3 kg banka", "банка 3 кг", "3 kg tin", 0.92),
])
one("mayonez", "Mayonez", "Майонез", "Mayonnaise", "kg", 24000, 0.02, "🫙", "майонез, mayonnaise")
one("ketchup", "Ketchup", "Кетчуп", "Ketchup", "kg", 21000, 0.02, "🥫", "кетчуп, ketchup")
one("sirka", "Sirka", "Уксус", "Vinegar", "l", 9000, 0.01, "🍶", "уксус, vinegar")
fam("asal", "Asal", "Мёд", "Honey", "kg", 85000, 0.02, "🍯", "мед, honey, asal", [
    ("tog", "tog' asali", "горный", "mountain", 1.3),
    ("paxta", "paxta asali", "хлопковый", "cotton", 0.85),
    ("akatsiya", "akatsiya", "акациевый", "acacia", 1.15),
])
fam("murabbo", "Murabbo", "Варенье", "Jam", "kg", 28000, 0.01, "🫙", "варенье, fruit jam", [
    ("orik", "o'rik", "абрикосовое", "apricot", 1.1),
], base_label=("qulupnay", "клубничное", "strawberry"))
one("shokolad", "Shokolad", "Шоколад", "Chocolate", "kg", 110000, 0.04, "🍫", "шоколад, chocolate")
fam("konfet", "Konfet", "Конфеты", "Candies", "kg", 45000, 0.02, "🍬", "конфеты, candy", [
    ("karamel", "karamel", "карамель", "caramel", 0.75),
    ("shokoladli", "shokoladli", "шоколадные", "chocolate", 1.6, "🍫"),
], base_label=("assorti", "ассорти", "assorted"))
fam("pechenye", "Pechenye", "Печенье", "Biscuits", "kg", 30000, 0.02, "🍪", "печенье, cookies", [
    ("kraker", "~Kraker", "~Крекер", "~Crackers", 1.0),
])
one("vafli", "Vafli", "Вафли", "Wafers", "kg", 34000, 0.01, "🧇", "вафли, wafers")
one("holva", "Holva", "Халва", "Halva", "kg", 38000, 0.01, "🥮", "халва, halva")
one("parvarda", "Parvarda", "Парварда", "Parvarda (pulled sugar candy)", "kg", 32000, 0.01, "🍬", "парварда, parvarda")
one("xamirturush", "Xamirturush (quruq)", "Дрожжи сухие", "Dry yeast", "kg", 70000, 0.01, "🍞", "дрожжи, yeast")
one("kraxmal", "Kraxmal", "Крахмал", "Starch", "kg", 16000, 0.01, "🥣", "крахмал, starch")
one("tushonka", "Mol go'shti konservasi (tushonka)", "Тушёнка говяжья", "Canned stewed beef", "piece", 32000, 0.02, "🥫", "тушенка, canned beef")
one("noxat-konserva", "Konserva no'xat", "Горошек консервированный", "Canned peas", "piece", 11000, 0.01, "🥫", "горошек консервированный, canned peas")
one("tuzlangan-bodring", "Tuzlangan bodring (banka)", "Огурцы маринованные (банка)", "Pickled cucumbers (jar)", "piece", 18000, 0.01, "🥒", "соленые огурцы, pickles")
one("baliq-konserva", "Baliq konservasi", "Рыбные консервы", "Canned fish", "piece", 16000, 0.02, "🥫", "рыбные консервы, canned fish")
one("sut-kukuni", "Sut kukuni", "Сухое молоко", "Milk powder", "kg", 65000, 0.02, "🥛", "сухое молоко, milk powder")
one("quyultirilgan-sut", "Quyultirilgan sut", "Сгущённое молоко", "Condensed milk", "piece", 14000, 0.02, "🥛", "сгущенка, condensed milk")

# =================================================================== beverages (~35)
cat("beverages")
fam("choy", "Ko'k choy", "Зелёный чай", "Green tea", "kg", 62000, 0.00, "🍵", "чай, tea, choy, green tea", [
    ("95", "95-raqamli", "№95", "No. 95", 1.1),
    ("110", "110-raqamli", "№110", "No. 110", 0.95),
    ("jasmin", "jasminli", "с жасмином", "jasmine", 1.25),
])
fam("qora-choy", "Qora choy", "Чёрный чай", "Black tea", "kg", 70000, 0.01, "🫖", "черный чай, black tea", [
    ("granula", "granulali", "гранулированный", "granulated", 0.85),
    ("paketcha", "paketchali, 100 dona", "пакетированный, 100 шт", "tea bags, 100 pcs", 0.32, "piece"),
    ("assam", "Hind, Assam", "индийский, Ассам", "Indian Assam", 1.2),
], base_label=("bargli", "листовой", "loose leaf"))
one("namatak-choyi", "Na'matak choyi", "Чай из шиповника", "Rosehip tea", "kg", 45000, 0.01, "🍵", "шиповник, rosehip")
fam("qahva", "Qahva", "Кофе", "Coffee", "kg", 180000, 0.05, "☕", "кофе, coffee, kofe", [
    ("arabika", "donador, arabika", "в зёрнах, арабика", "beans, arabica", 1.25),
    ("maydalangan", "maydalangan", "молотый", "ground", 1.1),
    ("3in1", "3 in 1, 100 dona", "3 в 1, 100 шт", "3-in-1 sachets, 100 pcs", 0.4, "piece"),
], base_label=("eriydigan", "растворимый", "instant"))
fam("sharbat", "Sharbat", "Сок", "Juice", "l", 14000, 0.02, "🧃", "сок, juice, sharbat", [
    ("=olma-sharbati", "~Olma sharbati", "~Яблочный сок", "~Apple juice", 1.0),
    ("=shaftoli-nektari", "~Shaftoli nektari", "~Персиковый нектар", "~Peach nectar", 1.05),
    ("=apelsin-sharbati", "~Apelsin sharbati", "~Апельсиновый сок", "~Orange juice", 1.2),
    ("=uzum-sharbati", "~Uzum sharbati", "~Виноградный сок", "~Grape juice", 1.1),
    ("=multifrukt", "~Multifrukt sharbati", "~Мультифруктовый сок", "~Multifruit juice", 1.05),
    ("=anor-sharbati", "~Anor sharbati", "~Гранатовый сок", "~Pomegranate juice", 1.9),
    ("=pomidor-sharbati", "~Pomidor sharbati", "~Томатный сок", "~Tomato juice", 0.95),
], base=False)
fam("suv", "Ichimlik suvi", "Питьевая вода", "Drinking water", "piece", 2800, 0.01, "💧", "вода, water, suv", [
    ("05", "+0.5 l", "+0,5 л", "+0.5 l", 0.62),
    ("5l", "+5 l", "+5 л", "+5 l", 2.3),
    ("19l", "+19 l", "+19 л", "+19 l", 6.4),
    ("=mineral-gazli", "~Mineral suv (gazli, 1 l)", "~Минеральная вода газированная, 1 л", "~Sparkling mineral water, 1 l", 1.6),
    ("=mineral-gazsiz", "~Mineral suv (gazsiz, 1 l)", "~Минеральная вода без газа, 1 л", "~Still mineral water, 1 l", 1.5),
], base_label=("+1.5 l", "+1,5 л", "+1.5 l"))
fam("gazli-ichimlik", "Gazli ichimlik", "Газированный напиток", "Soft drink", "piece", 9500, 0.02, "🥤", "газировка, soda, soft drink", [
    ("=kola", "~Kola (1.5 l)", "~Кола, 1,5 л", "~Cola, 1.5 l", 1.1),
    ("=limonad", "~Limonad (1.5 l)", "~Лимонад, 1,5 л", "~Lemonade, 1.5 l", 0.9),
    ("=apelsinli-ichimlik", "~Apelsinli gazli ichimlik (1.5 l)", "~Апельсиновая газировка, 1,5 л", "~Orange soda, 1.5 l", 0.95),
    ("=tarxun", "~Tarxun (1.5 l)", "~Тархун, 1,5 л", "~Tarkhun soda, 1.5 l", 0.9),
    ("=energetik", "~Energetik ichimlik (0.45 l)", "~Энергетический напиток, 0,45 л", "~Energy drink, 0.45 l", 1.0),
], base=False)
one("kompot", "Kompot (3 l banka)", "Компот, 3 л", "Compote, 3 l jar", "piece", 26000, 0.01, "🫙", "компот, compote")
one("muzli-choy", "Muzli choy (1 l)", "Холодный чай, 1 л", "Iced tea, 1 l", "piece", 9000, 0.01, "🥤", "холодный чай, iced tea")
one("kvas", "Kvas (1.5 l)", "Квас, 1,5 л", "Kvass, 1.5 l", "piece", 9000, 0.02, "🥤", "квас, kvass")
one("kakao-ichimlik", "Kakao kukuni", "Какао-порошок", "Cocoa powder", "kg", 95000, 0.04, "☕", "какао, cocoa")

# =================================================================== spices (~30)
cat("spices")
fam("qora-murch", "Qora murch", "Чёрный перец", "Black pepper", "kg", 95000, 0.03, "⚫", "черный перец, black pepper, murch", [
    ("donador", "donador", "горошком", "whole", 0.92),
], base_label=("yanchilgan", "молотый", "ground"))
fam("qizil-qalampir", "Qizil qalampir", "Красный перец", "Red pepper", "kg", 60000, 0.04, "🌶️", "красный перец молотый, red pepper", [
    ("achchiq", "yanchilgan, achchiq", "молотый, острый", "ground, hot", 1.1),
    ("paprika", "~Shirin paprika", "~Паприка сладкая", "~Sweet paprika", 1.05, "🫑"),
], base_label=("yanchilgan", "молотый", "ground"))
fam("zira", "Zira", "Зира", "Cumin", "kg", 85000, 0.05, "🌿", "зира, cumin, кумин", [
    ("kerman", "Kerman, tog' zirasi", "горная, Керман", "Kerman mountain", 1.6),
])
one("kashnich-urugi", "Kashnich urug'i", "Кориандр (семена)", "Coriander seeds", "kg", 30000, 0.02, "🌿", "кориандр, coriander seeds")
one("zirk", "Zirk", "Барбарис", "Barberry", "kg", 75000, 0.03, "🍒", "барбарис, barberry")
one("kurkuma", "Kurkuma", "Куркума", "Turmeric", "kg", 55000, 0.02, "🫚", "куркума, turmeric")
one("zanjabil-kukuni", "Zanjabil kukuni", "Имбирь молотый", "Ground ginger", "kg", 80000, 0.02, "🫚", "имбирь молотый, ground ginger")
one("doljin", "Doljin", "Корица", "Cinnamon", "kg", 90000, 0.01, "🪵", "корица, cinnamon")
one("qalampirmunchoq", "Qalampirmunchoq", "Гвоздика", "Cloves", "kg", 160000, 0.02, "🌰", "гвоздика, cloves")
one("dafna-bargi", "Dafna bargi", "Лавровый лист", "Bay leaves", "kg", 50000, 0.01, "🍃", "лавровый лист, bay leaf, lavr")
one("quruq-yalpiz", "Quritilgan yalpiz", "Мята сушёная", "Dried mint", "kg", 60000, 0.01, "🌿", "сушеная мята, dried mint")
one("quruq-shivit", "Quritilgan shivit", "Укроп сушёный", "Dried dill", "kg", 55000, 0.01, "🌿", "сушеный укроп, dried dill")
one("quruq-rayhon", "Quritilgan rayhon", "Базилик сушёный", "Dried basil", "kg", 65000, 0.01, "🌿", "сушеный базилик, dried basil")
one("palov-ziravori", "Palov ziravori", "Приправа для плова", "Plov spice mix", "kg", 70000, 0.03, "🍛", "приправа для плова, plov spices")
one("shashlik-ziravori", "Shashlik ziravori", "Приправа для шашлыка", "Shashlik seasoning", "kg", 65000, 0.02, "🍢", "приправа для шашлыка, barbecue seasoning")
one("sumax", "Sumax", "Сумах", "Sumac", "kg", 70000, 0.01, "🍂", "сумах, sumac")
fam("kunjut", "Kunjut", "Кунжут", "Sesame", "kg", 32000, 0.02, "🌾", "кунжут, sesame", [
    ("qora", "qora", "чёрный", "black", 1.4),
], base_label=("oq", "белый", "white"))
one("kardamon", "Kardamon", "Кардамон", "Cardamom", "kg", 320000, 0.03, "🌿", "кардамон, cardamom")
one("muskat", "Muskat yong'og'i", "Мускатный орех", "Nutmeg", "kg", 210000, 0.02, "🌰", "мускатный орех, nutmeg")
one("zafar", "Za'faron", "Шафран", "Saffron", "kg", 9000000, 0.03, "🌼", "шафран, saffron, zafaron")
one("vanilin", "Vanilin", "Ванилин", "Vanillin", "kg", 240000, 0.01, "🍦", "ванилин, vanillin")
one("xantal", "Xantal kukuni", "Горчичный порошок", "Mustard powder", "kg", 45000, 0.01, "🌼", "горчица, mustard")
one("badyan", "Badyan", "Бадьян", "Star anise", "kg", 140000, 0.02, "⭐", "бадьян, star anise")
one("sarimsoq-kukuni", "Sarimsoq kukuni", "Чеснок сушёный молотый", "Garlic powder", "kg", 70000, 0.02, "🧄", "чесночный порошок, garlic powder")
one("limon-kislotasi", "Limon kislotasi", "Лимонная кислота", "Citric acid", "kg", 22000, 0.01, "🍋", "лимонная кислота, citric acid")

# =================================================================== construction (~60)
cat("construction")
fam("sement", "Sement", "Цемент", "Cement", "sack", 58000, 0.04, "🏗️", "цемент, cement, sement", [
    ("m500", "+M500 (50 kg)", "+M500 (50 кг)", "+M500 (50 kg)", 1.12),
    ("m400-t", "+M400 (tonna)", "+M400 (тонна)", "+M400 (per tonne)", 18.5, "t"),
    ("m500-t", "+M500 (tonna)", "+M500 (тонна)", "+M500 (per tonne)", 20.5, "t"),
    ("oq", "~Oq sement (25 kg)", "~Цемент белый (25 кг)", "~White cement (25 kg)", 1.6),
], base_label=("+M400 (50 kg)", "+M400 (50 кг)", "+M400 (50 kg)"))
fam("gisht", "G'isht", "Кирпич", "Brick", "piece", 1150, 0.02, "🧱", "кирпич, brick, gisht", [
    ("pishgan", "pishgan, qizil", "красный обожжённый", "fired red", 1.15),
    ("silikat", "silikat", "силикатный", "sand-lime", 1.05),
    ("govak", "g'ovak (pustotelka)", "пустотелый", "hollow", 1.2),
])
fam("gazoblok", "Gazoblok", "Газоблок", "Aerated concrete block", "piece", 14500, 0.03, "🧱", "газоблок, aerated block", [
    ("d600", "D600", "D600", "D600", 1.1),
], base_label=("D500, 600x300x200", "D500, 600x300x200", "D500, 600x300x200"))
fam("qum", "Qum", "Песок", "Sand", "t", 95000, 0.02, "🪨", "песок, sand, qum", [
    ("yuvilgan", "yuvilgan", "мытый", "washed", 1.25),
    ("karyer", "karyer", "карьерный", "quarry", 0.85),
], base_label=("daryo", "речной", "river"))
fam("shagal", "Shag'al", "Гравий", "Gravel", "t", 110000, 0.02, "🪨", "гравий, щебень, gravel, shagal", [
    ("20-40", "20-40 mm", "20-40 мм", "20-40 mm", 0.95),
], base_label=("5-20 mm", "5-20 мм", "5-20 mm"))
fam("armatura", "Armatura", "Арматура", "Rebar", "kg", 8900, 0.05, "🔩", "арматура, rebar, armatura", [
    ("8", "+8 mm", "+8 мм", "+8 mm", 1.06),
    ("10", "+10 mm", "+10 мм", "+10 mm", 1.03),
    ("14", "+14 mm", "+14 мм", "+14 mm", 0.99),
    ("16", "+16 mm", "+16 мм", "+16 mm", 0.98),
    ("12-t", "+12 mm (tonna)", "+12 мм (тонна)", "+12 mm (per tonne)", 960, "t"),
], base_label=("+12 mm", "+12 мм", "+12 mm"))
one("boglash-simi", "Bog'lash simi", "Вязальная проволока", "Binding wire", "kg", 16000, 0.03, "🔗", "вязальная проволока, binding wire")
one("setka", "Setka (to'r) 50x50", "Сетка-рабица 50x50", "Chain-link mesh 50x50", "m", 18000, 0.02, "🔗", "сетка, mesh, setka")
one("profil-quvur", "Profil quvur 40x20", "Профильная труба 40x20", "Steel box section 40x20", "m", 21000, 0.04, "🔩", "профильная труба, box section")
one("polat-quvur", "Po'lat quvur 57 mm", "Стальная труба 57 мм", "Steel pipe 57 mm", "m", 68000, 0.04, "🚰", "стальная труба, steel pipe")
one("burchak", "Burchak (ugolok) 50x50", "Уголок 50x50", "Steel angle 50x50", "m", 32000, 0.03, "🔩", "уголок, steel angle")
fam("profnastil", "Profnastil", "Профнастил", "Corrugated steel sheet", "piece", 140000, 0.03, "🏠", "профнастил, roofing sheet", [
    ("rangli", "rangli, S-20", "цветной, С-20", "coloured, S-20", 1.3),
], base_label=("S-8, rux qoplamali", "С-8, оцинкованный", "S-8, galvanised"))
one("metallocherepitsa", "Metallocherepitsa", "Металлочерепица", "Metal roof tiles", "piece", 185000, 0.03, "🏠", "металлочерепица, metal tiles")
one("shifer", "Shifer (8 to'lqinli)", "Шифер 8-волновой", "Slate sheet (8-wave)", "piece", 62000, 0.02, "🏠", "шифер, slate")
one("taxta", "Taxta (qarag'ay, 25 mm)", "Доска сосновая 25 мм", "Pine board 25 mm", "piece", 52000, 0.02, "🪵", "доска, board, taxta")
one("brus", "Brus 100x100", "Брус 100x100", "Timber beam 100x100", "piece", 145000, 0.02, "🪵", "брус, timber beam")
one("fanera", "Fanera 18 mm", "Фанера 18 мм", "Plywood 18 mm", "piece", 260000, 0.03, "🪵", "фанера, plywood")
one("dsp", "DSP 16 mm", "ДСП 16 мм", "Chipboard 16 mm", "piece", 210000, 0.02, "🪵", "дсп, chipboard")
one("osb", "OSB-3 9 mm", "OSB-3 9 мм", "OSB-3 board 9 mm", "piece", 160000, 0.02, "🪵", "осб, osb")
one("emulsiya-boyoq", "Suv emulsiya bo'yoq", "Водоэмульсионная краска", "Water-based paint", "kg", 18000, 0.02, "🎨", "водоэмульсионка, emulsion paint, kraska")
one("fasad-boyoq", "Fasad bo'yog'i", "Фасадная краска", "Facade paint", "kg", 26000, 0.02, "🎨", "фасадная краска, facade paint")
one("moyli-boyoq", "Moyli bo'yoq (PF-115)", "Эмаль ПФ-115", "Alkyd enamel PF-115", "kg", 32000, 0.03, "🎨", "эмаль, enamel paint")
one("gruntovka", "Gruntovka", "Грунтовка", "Primer", "l", 15000, 0.02, "🪣", "грунтовка, primer")
fam("shpaklyovka", "Shpaklyovka", "Шпаклёвка", "Putty", "sack", 85000, 0.02, "🪣", "шпаклевка, putty", [
    ("boshlangich", "boshlang'ich", "стартовая", "base coat", 0.85),
], base_label=("pardozlash, 25 kg", "финишная, 25 кг", "finishing, 25 kg"))
one("gipsli-suvoq", "Gipsli suvoq (30 kg)", "Гипсовая штукатурка (30 кг)", "Gypsum plaster (30 kg)", "sack", 78000, 0.02, "🪣", "штукатурка, plaster")
one("alebastr", "Alebastr", "Алебастр", "Alabaster", "kg", 3500, 0.02, "🪣", "алебастр, alabaster, gips")
one("kafel-yelimi", "Kafel yelimi (25 kg)", "Плиточный клей (25 кг)", "Tile adhesive (25 kg)", "sack", 68000, 0.02, "🪣", "плиточный клей, tile adhesive")
one("gipsokarton", "Gipsokarton 12.5 mm", "Гипсокартон 12,5 мм", "Plasterboard 12.5 mm", "piece", 62000, 0.02, "⬜", "гипсокартон, drywall")
fam("kafel", "Kafel", "Кафель", "Ceramic tiles", "piece", 85000, 0.02, "🔲", "кафель, плитка, tiles", [
    ("=keramogranit", "~Keramogranit 60x60 (1 m²)", "~Керамогранит 60x60 (1 м²)", "~Porcelain tiles 60x60 (1 m²)", 1.7),
], base_label=("devor, 1 m² quti", "настенный, коробка 1 м²", "wall, 1 m² box"))
one("laminat", "Laminat 8 mm (1 m²)", "Ламинат 8 мм (1 м²)", "Laminate flooring 8 mm (1 m²)", "piece", 95000, 0.02, "🪵", "ламинат, laminate")
one("oyna", "Oyna 4 mm (1 m²)", "Стекло 4 мм (1 м²)", "Glass 4 mm (1 m²)", "piece", 75000, 0.02, "🪟", "стекло, glass, oyna")
one("plastik-deraza", "Plastik deraza", "Пластиковое окно", "uPVC window", "piece", 1450000, 0.02, "🪟", "пластиковое окно, pvc window")
one("mdf-eshik", "Eshik (MDF)", "Дверь МДФ", "MDF door", "piece", 950000, 0.01, "🚪", "дверь, door")
one("temir-eshik", "Temir eshik", "Металлическая дверь", "Steel door", "piece", 2400000, 0.02, "🚪", "металлическая дверь, steel door")
fam("ppr-quvur", "PPR quvur", "Труба PPR", "PPR pipe", "m", 9000, 0.02, "🚰", "труба ппр, ppr pipe", [
    ("25", "+25 mm", "+25 мм", "+25 mm", 1.4),
], base_label=("+20 mm", "+20 мм", "+20 mm"))
one("kanalizatsiya-quvuri", "Kanalizatsiya quvuri 110 mm", "Канализационная труба 110 мм", "Sewer pipe 110 mm", "m", 26000, 0.02, "🚰", "канализационная труба, sewer pipe")
one("shurup", "Shurup (3.5x35)", "Саморезы 3,5x35", "Wood screws 3.5x35", "kg", 38000, 0.02, "🔩", "саморезы, screws")
one("mix", "Mix (100 mm)", "Гвозди 100 мм", "Nails 100 mm", "kg", 16000, 0.02, "🔨", "гвозди, nails")
one("penoplast", "Penoplast 50 mm", "Пенопласт 50 мм", "EPS foam board 50 mm", "piece", 26000, 0.02, "🧊", "пенопласт, polystyrene")
one("minvata", "Mineral paxta (minvata)", "Минеральная вата", "Mineral wool", "piece", 185000, 0.02, "☁️", "минвата, mineral wool")

# =================================================================== textiles (~35)
cat("textiles")
fam("paxta-mato", "Paxta mato", "Хлопковая ткань", "Cotton fabric", "m", 19000, -0.01, "🧵", "ткань, fabric, mato", [
    ("boz", "~Bo'z", "~Бязь суровая", "~Grey cotton cloth", 0.7),
    ("chit", "~Chit", "~Ситец", "~Chintz", 0.85),
    ("satin", "~Satin", "~Сатин", "~Sateen", 1.4),
    ("byaz", "~Byaz", "~Бязь", "~Calico", 0.9),
    ("flanel", "~Flanel", "~Фланель", "~Flannel", 1.2),
])
one("denim", "Jinsi mato (denim)", "Джинсовая ткань", "Denim fabric", "m", 42000, 0.01, "👖", "джинсовая ткань, denim")
one("atlas", "Atlas", "Атлас", "Atlas silk", "m", 65000, 0.00, "👘", "атлас, silk")
one("adras", "Adras", "Адрас", "Adras (silk-cotton ikat)", "m", 48000, 0.01, "👘", "адрас, adras, ikat")
one("shoyi", "Shoyi", "Натуральный шёлк", "Natural silk", "m", 120000, 0.02, "🧵", "шелк, silk, shoyi")
one("baxmal", "Baxmal", "Бархат", "Velvet", "m", 55000, 0.01, "🧵", "бархат, velvet")
one("trikotaj", "Trikotaj mato", "Трикотажное полотно", "Knit fabric", "kg", 85000, 0.02, "🧵", "трикотаж, knit fabric")
one("gabardin", "Gabardin", "Габардин", "Gabardine", "m", 36000, 0.01, "🧵", "габардин, gabardine")
fam("ip", "Paxta ipi", "Хлопковая пряжа", "Cotton yarn", "kg", 46000, 0.02, "🧵", "пряжа, yarn", [
    ("ne20", "Ne 20/1", "Ne 20/1", "Ne 20/1", 0.9),
    ("ne40", "Ne 40/1", "Ne 40/1", "Ne 40/1", 1.2),
], base_label=("Ne 30/1", "Ne 30/1", "Ne 30/1"))
one("jun-ip", "Jun ip", "Шерстяная пряжа", "Wool yarn", "kg", 110000, 0.02, "🧶", "шерсть, wool yarn")
one("tikuv-ipi", "Tikuv ipi (g'altak)", "Швейные нитки (катушка)", "Sewing thread (spool)", "piece", 6000, 0.01, "🧵", "нитки, sewing thread")
one("paxta-tolasi", "Paxta tolasi", "Хлопковое волокно", "Cotton fibre", "kg", 21000, 0.03, "☁️", "хлопок, cotton fibre, paxta")
one("futbolka", "Futbolka (paxta)", "Футболка хлопковая", "Cotton T-shirt", "piece", 38000, 0.01, "👕", "футболка, t-shirt")
one("erkaklar-koylagi", "Erkaklar ko'ylagi", "Мужская рубашка", "Men's shirt", "piece", 95000, 0.01, "👔", "рубашка, shirt")
one("jinsi-shim", "Jinsi shim", "Джинсы", "Jeans", "piece", 140000, 0.01, "👖", "джинсы, jeans")
one("ayollar-koylagi", "Ayollar ko'ylagi (plate)", "Женское платье", "Women's dress", "piece", 160000, 0.01, "👗", "платье, dress")
one("bolalar-kiyimi", "Bolalar kiyimi to'plami", "Детский комплект одежды", "Kids' clothing set", "piece", 85000, 0.01, "👕", "детская одежда, kids clothing")
one("paypoq", "Paypoq (12 juft)", "Носки (12 пар)", "Socks (12 pairs)", "piece", 48000, 0.01, "🧦", "носки, socks")
one("ish-kiyimi", "Ish kiyimi (kombinezon)", "Спецодежда (комбинезон)", "Workwear overalls", "piece", 180000, 0.01, "🦺", "спецовка, workwear")
one("qishki-kurtka", "Qishki kurtka", "Зимняя куртка", "Winter jacket", "piece", 420000, 0.03, "🧥", "куртка, jacket")
one("romol", "Ro'mol", "Платок", "Headscarf", "piece", 35000, 0.01, "🧣", "платок, scarf, romol")
one("doppi", "Do'ppi", "Тюбетейка", "Doppi (skullcap)", "piece", 60000, 0.00, "🧢", "тюбетейка, doppi")
one("sochiq", "Sochiq (mahra)", "Махровое полотенце", "Terry towel", "piece", 42000, 0.01, "🛁", "полотенце, towel")
one("choyshab", "Choyshab to'plami", "Комплект постельного белья", "Bed linen set", "piece", 260000, 0.01, "🛏️", "постельное белье, bed linen")
one("korpa", "Ko'rpa", "Одеяло", "Quilt", "piece", 320000, 0.02, "🛏️", "одеяло, quilt, korpa")
one("yostiq", "Yostiq", "Подушка", "Pillow", "piece", 75000, 0.01, "🛏️", "подушка, pillow")
one("krossovka", "Krossovka", "Кроссовки", "Sneakers", "piece", 240000, 0.01, "👟", "кроссовки, sneakers")
one("shippak", "Shippak", "Шлёпанцы", "Flip-flops", "piece", 28000, 0.00, "🩴", "шлепанцы, slippers")

# =================================================================== electronics (~45)
cat("electronics")
fam("led-lampa", "LED lampa", "LED лампа", "LED bulb", "piece", 15000, -0.03, "💡", "лампа, bulb, lampochka", [
    ("7w", "+7W", "+7W", "+7W", 0.65),
    ("9w", "+9W", "+9W", "+9W", 0.78),
    ("15w", "+15W", "+15W", "+15W", 1.2),
    ("20w", "+20W", "+20W", "+20W", 1.55),
], base_label=("+12W", "+12W", "+12W"))
fam("led-projektor", "LED projektor", "LED прожектор", "LED floodlight", "piece", 95000, -0.02, "🔦", "прожектор, floodlight", [
    ("100w", "+100W", "+100W", "+100W", 1.7),
], base_label=("+50W", "+50W", "+50W"))
fam("kabel", "Elektr kabel", "Кабель", "Power cable", "m", 9500, 0.04, "🔌", "кабель, cable", [
    ("2x1-5", "+2x1.5", "+2x1,5", "+2x1.5", 0.45),
    ("3x1-5", "+3x1.5", "+3x1,5", "+3x1.5", 0.62),
    ("3x4", "+3x4", "+3x4", "+3x4", 1.55),
    ("3x6", "+3x6", "+3x6", "+3x6", 2.2),
], base_label=("+3x2.5", "+3x2,5", "+3x2.5"))
one("rozetka", "Rozetka", "Розетка", "Power socket", "piece", 18000, 0.01, "🔌", "розетка, socket")
one("vyklyuchatel", "Vyklyuchatel", "Выключатель", "Light switch", "piece", 16000, 0.01, "🎚️", "выключатель, switch")
fam("avtomat", "Avtomatik o'chirgich", "Автоматический выключатель", "Circuit breaker", "piece", 32000, 0.02, "⚡", "автомат, breaker", [
    ("32a", "+32A", "+32A", "+32A", 1.15),
], base_label=("+16A", "+16A", "+16A"))
one("uzaytirgich", "Uzaytirgich (5 m)", "Удлинитель 5 м", "Extension cord (5 m)", "piece", 55000, 0.01, "🔌", "удлинитель, extension cord")
one("hisoblagich", "Elektr hisoblagich", "Электросчётчик", "Electricity meter", "piece", 420000, 0.02, "⚡", "счетчик, electricity meter")
one("quyosh-paneli", "Quyosh paneli 450W", "Солнечная панель 450W", "Solar panel 450W", "piece", 1850000, -0.05, "☀️", "солнечная панель, solar panel")
one("invertor", "Invertor 5 kW", "Инвертор 5 кВт", "Inverter 5 kW", "piece", 6500000, -0.03, "⚡", "инвертор, inverter")
fam("akkumulyator", "Akkumulyator", "Аккумулятор", "Battery", "piece", 1900000, 0.01, "🔋", "аккумулятор, battery", [
    ("200ah", "+200 Ah, gel", "+200 Ач, гелевый", "+200 Ah, gel", 2.4),
    ("avto", "~Avto akkumulyator 60 Ah", "~Автомобильный аккумулятор 60 Ач", "~Car battery 60 Ah", 0.45),
], base_label=("+100 Ah", "+100 Ач", "+100 Ah"))
one("batareyka", "Batareyka AA (4 dona)", "Батарейки AA (4 шт)", "AA batteries (4 pcs)", "piece", 14000, 0.01, "🔋", "батарейки, batteries")
fam("televizor", "Televizor", "Телевизор", "TV", "piece", 2300000, -0.04, "📺", "телевизор, tv, television", [
    ("43", "+43\"", "+43\"", "+43\"", 1.75),
    ("55", "+55\"", "+55\"", "+55\"", 2.9),
], base_label=("+32\"", "+32\"", "+32\""))
fam("konditsioner", "Konditsioner", "Кондиционер", "Air conditioner", "piece", 4800000, 0.05, "❄️", "кондиционер, air conditioner", [
    ("9000", "+9000 BTU", "+9000 BTU", "+9000 BTU", 0.8),
    ("18000", "+18000 BTU", "+18000 BTU", "+18000 BTU", 1.45),
], base_label=("+12000 BTU", "+12000 BTU", "+12000 BTU"))
one("muzlatkich", "Muzlatkich (ikki kamerali)", "Холодильник двухкамерный", "Two-door refrigerator", "piece", 5200000, 0.02, "❄️", "холодильник, fridge, refrigerator")
one("kir-mashina", "Kir yuvish mashinasi 7 kg", "Стиральная машина 7 кг", "Washing machine 7 kg", "piece", 3900000, 0.01, "🫧", "стиральная машина, washing machine")
one("elektr-choynak", "Elektr choynak", "Электрочайник", "Electric kettle", "piece", 180000, 0.01, "♨️", "электрочайник, kettle")
one("dazmol", "Dazmol", "Утюг", "Iron", "piece", 220000, 0.01, "👔", "утюг, iron")
one("changyutgich", "Changyutgich", "Пылесос", "Vacuum cleaner", "piece", 950000, 0.01, "🧹", "пылесос, vacuum cleaner")
one("ventilyator", "Ventilyator", "Вентилятор", "Electric fan", "piece", 260000, -0.03, "🌀", "вентилятор, fan")
one("isitgich", "Elektr isitgich", "Электрообогреватель", "Electric heater", "piece", 420000, 0.06, "🔥", "обогреватель, heater")
one("boyler", "Suv isitgich (boyler 80 l)", "Водонагреватель 80 л", "Water heater 80 l", "piece", 1600000, 0.02, "🚿", "бойлер, water heater")
one("smartfon", "Smartfon", "Смартфон", "Smartphone", "piece", 2600000, -0.02, "📱", "смартфон, smartphone, telefon")
one("noutbuk", "Noutbuk", "Ноутбук", "Laptop", "piece", 7200000, -0.02, "💻", "ноутбук, laptop")
one("monitor", "Monitor 24\"", "Монитор 24\"", "Monitor 24\"", "piece", 1700000, -0.01, "🖥️", "монитор, monitor")
one("router", "Wi-Fi router", "Wi-Fi роутер", "Wi-Fi router", "piece", 320000, 0.00, "📶", "роутер, router")
one("kuzatuv-kamerasi", "Kuzatuv kamerasi", "Камера видеонаблюдения", "CCTV camera", "piece", 450000, 0.01, "📹", "камера видеонаблюдения, cctv")
one("quloqchin", "Quloqchin", "Наушники", "Headphones", "piece", 160000, 0.00, "🎧", "наушники, headphones")
one("zaryadlagich", "Telefon zaryadlagichi", "Зарядное устройство", "Phone charger", "piece", 45000, 0.00, "🔌", "зарядка, charger")

# =================================================================== household & hygiene (~35)
cat("household")
fam("kir-kukuni", "Kir yuvish kukuni", "Стиральный порошок", "Laundry powder", "kg", 24000, 0.02, "🫧", "стиральный порошок, detergent, poroshok", [
    ("qolda", "qo'lda yuvish uchun", "для ручной стирки", "hand wash", 0.85),
], base_label=("avtomat", "автомат", "machine wash"))
one("suyuq-kir-vositasi", "Suyuq kir yuvish vositasi", "Жидкое средство для стирки", "Liquid laundry detergent", "l", 28000, 0.02, "🧴", "гель для стирки, liquid detergent")
one("kir-yumshatgich", "Kir yumshatgich", "Кондиционер для белья", "Fabric softener", "l", 22000, 0.01, "🧴", "кондиционер для белья, fabric softener")
one("idish-vositasi", "Idish yuvish vositasi", "Средство для мытья посуды", "Dishwashing liquid", "l", 16000, 0.01, "🍽️", "средство для посуды, dish soap")
one("xojalik-sovuni", "Xo'jalik sovuni", "Хозяйственное мыло", "Laundry soap bar", "piece", 4500, 0.01, "🧼", "хозяйственное мыло, laundry soap")
one("atir-sovun", "Atir sovun", "Туалетное мыло", "Toilet soap", "piece", 6500, 0.01, "🧼", "мыло, soap")
one("suyuq-sovun", "Suyuq sovun", "Жидкое мыло", "Liquid soap", "l", 18000, 0.01, "🧴", "жидкое мыло, liquid soap")
one("shampun", "Shampun", "Шампунь", "Shampoo", "l", 45000, 0.02, "🧴", "шампунь, shampoo")
one("tish-pastasi", "Tish pastasi", "Зубная паста", "Toothpaste", "piece", 14000, 0.01, "🪥", "зубная паста, toothpaste")
one("tish-chotkasi", "Tish cho'tkasi", "Зубная щётка", "Toothbrush", "piece", 8000, 0.00, "🪥", "зубная щетка, toothbrush")
one("dezodorant", "Dezodorant", "Дезодорант", "Deodorant", "piece", 32000, 0.01, "🧴", "дезодорант, deodorant")
one("ustara", "Soqol olish ustarasi", "Бритвенные станки", "Razors", "piece", 12000, 0.00, "🪒", "бритва, razor")
one("tualet-qogozi", "Tualet qog'ozi (rulon)", "Туалетная бумага", "Toilet paper", "piece", 2500, 0.02, "🧻", "туалетная бумага, toilet paper")
one("qogoz-sochiq", "Qog'oz sochiq", "Бумажные полотенца", "Paper towels", "piece", 6500, 0.02, "🧻", "бумажные полотенца, paper towels")
one("salfetka", "Salfetka (100 dona)", "Салфетки (100 шт)", "Napkins (100 pcs)", "piece", 5000, 0.01, "🧻", "салфетки, napkins")
one("nam-salfetka", "Nam salfetka", "Влажные салфетки", "Wet wipes", "piece", 9000, 0.01, "🧻", "влажные салфетки, wet wipes")
one("taglik", "Bolalar tagligi", "Детские подгузники", "Baby diapers", "piece", 95000, 0.02, "👶", "подгузники, diapers, pampers")
one("prokladka", "Gigiyenik prokladka", "Гигиенические прокладки", "Sanitary pads", "piece", 14000, 0.01, "🌸", "прокладки, sanitary pads")
one("oqartiruvchi", "Oqartiruvchi vosita", "Отбеливатель", "Bleach", "l", 9000, 0.01, "🧪", "отбеливатель, bleach, belizna")
one("unitaz-vositasi", "Unitaz tozalagich", "Средство для унитаза", "Toilet cleaner", "l", 16000, 0.01, "🚽", "средство для унитаза, toilet cleaner")
one("oyna-tozalagich", "Oyna tozalagich", "Средство для стёкол", "Glass cleaner", "l", 14000, 0.01, "🪟", "средство для стекол, glass cleaner")
one("pol-vositasi", "Pol yuvish vositasi", "Средство для мытья полов", "Floor cleaner", "l", 15000, 0.01, "🪣", "средство для пола, floor cleaner")
one("dezinfeksiya", "Dezinfeksiya vositasi", "Дезинфицирующее средство", "Disinfectant", "l", 24000, 0.01, "🧴", "дезинфекция, disinfectant")
one("gubka", "Gubka (10 dona)", "Губки (10 шт)", "Sponges (10 pcs)", "piece", 9000, 0.00, "🧽", "губки, sponges")
one("axlat-paketi", "Axlat paketi (rulon)", "Мешки для мусора", "Garbage bags (roll)", "piece", 12000, 0.01, "🗑️", "мешки для мусора, garbage bags")
one("rezina-qolqop", "Rezina qo'lqop", "Резиновые перчатки", "Rubber gloves", "piece", 8000, 0.00, "🧤", "перчатки, gloves")
one("supurgi", "Supurgi", "Веник", "Broom", "piece", 22000, 0.00, "🧹", "веник, broom")
one("shvabra", "Shvabra", "Швабра", "Mop", "piece", 45000, 0.00, "🪣", "швабра, mop")
one("havo-tozalagich", "Havo xushbo'ylagich (aerozol)", "Освежитель воздуха", "Air freshener", "piece", 16000, 0.01, "🌸", "освежитель, air freshener")
one("hasharot-aerozol", "Hasharotlarga qarshi aerozol", "Аэрозоль от насекомых", "Insect spray", "piece", 28000, 0.02, "🦟", "от комаров, insect spray")
one("gugurt", "Gugurt (10 quti)", "Спички (10 коробков)", "Matches (10 boxes)", "piece", 3000, 0.00, "🔥", "спички, matches")
one("sham", "Sham", "Свечи", "Candles", "piece", 3500, 0.00, "🕯️", "свечи, candles")
one("tibbiy-niqob", "Tibbiy niqob (50 dona)", "Медицинские маски (50 шт)", "Face masks (50 pcs)", "piece", 25000, -0.02, "😷", "маски, face masks")
one("paxta-disk", "Paxta disklari", "Ватные диски", "Cotton pads", "piece", 9000, 0.00, "☁️", "ватные диски, cotton pads")

# =================================================================== packaging & other (~20)
cat("other")
fam("karton-quti", "Karton quti", "Картонная коробка", "Cardboard box", "piece", 4500, 0.02, "📦", "коробка, box, cardboard box", [
    ("orta", "o'rta", "средняя", "medium", 1.6),
    ("katta", "katta", "большая", "large", 2.4),
], base_label=("kichik", "малая", "small"))
one("paket-mayka", "Polietilen paket (mayka)", "Пакет-майка", "T-shirt plastic bags", "kg", 24000, 0.02, "🛍️", "пакет, plastic bags")
one("pp-qop", "Polipropilen qop (50 kg)", "Полипропиленовый мешок (50 кг)", "Woven PP sack (50 kg)", "piece", 1800, 0.02, "🛍️", "мешок, pp sack")
one("strech-plyonka", "Strech plyonka", "Стрейч-плёнка", "Stretch film", "piece", 85000, 0.02, "🎞️", "стрейч пленка, stretch film")
one("skotch", "Skotch (qadoqlash lentasi)", "Скотч упаковочный", "Packing tape", "piece", 7000, 0.01, "🎞️", "скотч, tape")
one("bir-martalik-stakan", "Bir martalik stakan (100 dona)", "Одноразовые стаканы (100 шт)", "Disposable cups (100 pcs)", "piece", 22000, 0.01, "🥤", "одноразовые стаканы, disposable cups")
one("bir-martalik-tarelka", "Bir martalik tarelka (50 dona)", "Одноразовые тарелки (50 шт)", "Disposable plates (50 pcs)", "piece", 18000, 0.01, "🍽️", "одноразовые тарелки, disposable plates")
one("bir-martalik-qoshiq", "Bir martalik qoshiq-vilka (100 dona)", "Одноразовые приборы (100 шт)", "Disposable cutlery (100 pcs)", "piece", 15000, 0.01, "🍴", "одноразовые вилки, cutlery")
one("konteyner", "Oziq-ovqat konteyneri (50 dona)", "Пищевые контейнеры (50 шт)", "Food containers (50 pcs)", "piece", 45000, 0.02, "🥡", "контейнеры, food containers")
one("folga", "Alyuminiy folga", "Алюминиевая фольга", "Aluminium foil", "piece", 25000, 0.02, "🥡", "фольга, foil")
one("pet-butilka", "PET butilka (1.5 l)", "ПЭТ бутылка 1,5 л", "PET bottle 1.5 l", "piece", 900, 0.02, "🧴", "пэт бутылка, pet bottle")
one("shisha-banka", "Shisha banka (1 l)", "Стеклянная банка 1 л", "Glass jar 1 l", "piece", 3500, 0.01, "🫙", "банка, glass jar")
one("tuxum-lotogi", "Tuxum lotogi", "Лоток для яиц", "Egg tray", "piece", 600, 0.01, "🥚", "лоток для яиц, egg tray")
one("poddon", "Yog'och poddon", "Деревянный поддон", "Wooden pallet", "piece", 95000, 0.02, "🪵", "поддон, pallet")
one("kanop", "Kanop (shpagat)", "Шпагат", "Twine", "kg", 30000, 0.01, "🪢", "шпагат, twine")
one("etiketka", "Etiketka (rulon)", "Этикетки (рулон)", "Labels (roll)", "piece", 35000, 0.01, "🏷️", "этикетки, labels")
one("a4-qogoz", "A4 qog'oz (500 varaq)", "Бумага А4 (500 листов)", "A4 paper (500 sheets)", "piece", 55000, 0.02, "📄", "бумага а4, paper")
one("kassa-lentasi", "Kassa lentasi", "Кассовая лента", "Receipt paper roll", "piece", 4500, 0.01, "🧾", "кассовая лента, receipt roll")
# office & stationery (buyers' requests often start here: "1 000 pens for our offices")
one("sharikli-ruchka", "Sharikli ruchka", "Шариковая ручка", "Ballpoint pen", "piece", 1500, 0.01, "🖊️", "ruchka, ручка, ручки, pen, pens")
one("gelli-ruchka", "Gelli ruchka", "Гелевая ручка", "Gel pen", "piece", 3000, 0.01, "🖊️", "гелевая ручка, gel pen")
one("qalam", "Qalam (grafitli)", "Карандаш", "Pencil", "piece", 1200, 0.00, "✏️", "карандаш, pencil, qalamlar")
one("marker", "Marker", "Маркер", "Marker", "piece", 6000, 0.01, "🖍️", "маркер, marker")
one("daftar", "Daftar (48 varaq)", "Тетрадь 48 листов", "Notebook (48 sheets)", "piece", 4500, 0.02, "📓", "тетрадь, notebook, daftarlar")
one("bloknot", "Bloknot A5", "Блокнот А5", "Notepad A5", "piece", 12000, 0.01, "📒", "блокнот, notepad")
one("papka", "Papka-fayl", "Папка-файл", "Document folder", "piece", 7000, 0.01, "📁", "папка, folder")
one("stepler", "Stepler", "Степлер", "Stapler", "piece", 25000, 0.00, "📎", "степлер, stapler")
one("skrepka", "Skrepka (100 dona)", "Скрепки (100 шт)", "Paper clips (100 pcs)", "piece", 6000, 0.00, "📎", "скрепки, paper clips")
one("ofis-kreslo", "Ofis kreslosi", "Офисное кресло", "Office chair", "piece", 950000, 0.02, "🪑", "офисное кресло, office chair")


def validate() -> None:
    slugs = [p.slug for p in PRODUCTS]
    dup = {s for s in slugs if slugs.count(s) > 1}
    assert not dup, f"duplicate slugs: {dup}"
    for p in PRODUCTS:
        assert re.fullmatch(r"[a-z0-9-]{2,60}", p.slug), p.slug
        assert p.unit in UNITS, (p.slug, p.unit)
        assert p.emoji and len(p.emoji.encode()) <= 16, (p.slug, p.emoji)
        assert len(p.name_uz) <= 100 and len(p.name_ru) <= 100 and len(p.name_en) <= 100, p.slug


validate()
