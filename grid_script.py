import sys
import re

file_path = "src/App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Etsitään "katsaus"-alueen alku 
# {reportTab === 'katsaus' && (
# <div>
# (ja sitten superadmin render)

start_marker = "{reportTab === 'katsaus' && ("

# Tarkoitus on korvata Superadmin, Admin ja Seller raporttinäkymä grid-kehikolla.

# Koska koodi on liian pitkä ja sisältää useita lohkoja (Superadmin, Admin, Seller), 
# muutan niiden asettelun "Kojelaudaksi".

# Etsitään Superadminin "Global KPIs":
content = content.replace("className=\"mb-8\"", "className=\"mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6\"")
content = content.replace("className=\"bg-stone-900 text-white rounded-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden\"", "className=\"bg-stone-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden lg:col-span-3\"")

# Katsotaan nopea skripti, joka muuttaa vanhat otsikot oikeaan Sentence caseen
content = content.replace(">Konsernin yleiskatsaus<", ">Konsernin yleiskatsaus<")
content = content.replace("Asiakasriskit ja Laajentuminen", "Asiakasriskit ja laajentuminen")
content = content.replace("Alueiden vertailu", "Alueiden vertailu")

content = content.replace("Alueen kasvu & tavoite", "Alueen kasvu ja tavoite")
content = content.replace("Alueen Tuloskortti", "Alueen tuloskortti")
content = content.replace("Oma Tuloskortti", "Oma tuloskortti")
content = content.replace("Tiimin tilanne", "Tiimin tilanne")

content = content.replace("Tehtävien suoritusaste", "Tehtävien suoritusaste")
content = content.replace("Asiakastyytyväisyyskysely", "Asiakastyytyväisyyskysely")
content = content.replace("Sparraajan Huomiot", "Sparraajan huomiot")
content = content.replace("Aktiviteettihistoria", "Aktiviteettihistoria")

# Vaihdetaan Adminin raporttien parent flex -> grid
content = content.replace(
    'className="flex flex-col lg:flex-row gap-6 mb-8"',
    'className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8"'
)

# Adminin tuloskortti saa span-1
content = content.replace(
    'className="w-full lg:w-1/2 bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200"',
    'className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200 lg:col-span-1"'
)
content = content.replace(
    'className="w-full lg:w-1/2 bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200 flex flex-col"',
    'className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200 flex flex-col lg:col-span-1"'
)

# Adminin alueen kasvu voi olla span-1 myös.

# Nyt etsitään Seller osuus
content = content.replace(
    'className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"',
    'className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"'
)

# Tuloskortti saa col-span-2 tai 1
content = content.replace(
    'className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-sm border border-stone-200"',
    'className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-sm border border-stone-200 lg:col-span-2"'
)

# Tilastot ja Sparraaja saavat omat gridinsa
content = content.replace(
    'className="space-y-6"',
    'className="space-y-6 lg:col-span-1"'
)

# Tilastot container
content = content.replace(
    'className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200"',
    'className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200 h-full"'
)

# Sparraaja tuunaus
content = content.replace(
    'className="bg-[#f0fdf4] border border-[#dcfce7] rounded-[2rem] p-6 shadow-sm relative overflow-hidden"',
    'className="bg-[#f0fdf4] border border-[#dcfce7] rounded-[2rem] p-6 shadow-sm relative overflow-hidden h-full flex flex-col"'
)

# Oma työlista siirretään gridiin. (Se on nyt divin sisällä kaukana alhaana).
# "Oma työlista" on omassa lohkossaan, jota ei ehkä tarvitse muuttaa gridiin.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Valmis.")
