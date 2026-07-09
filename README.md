# Car360 — ניהול הרכבים שלי 🚗

אפליקציית Web (PWA) לניהול כל מה שמסביב לרכב: טיפולים, ביטוחים, מסמכים, תזכורות ושיתוף עם בני משפחה — בעברית, Mobile-First, עם מצב כהה/בהיר.

## הרצה מקומית

```bash
npm install
npm run dev
```

בלי שום הגדרה נוספת האפליקציה עולה ב**מצב דמו מקומי**: הנתונים נשמרים ב-IndexedDB על המכשיר, וכפתור "כניסה עם Google" יוצר משתמש דמו. זה מאפשר לחוות את כל האפליקציה מיד.

## Firebase

הפרויקט מחובר לפרויקט Firebase בשם **car360-50b44** (הקונפיגורציה הציבורית ב-`.env`).
כללי האבטחה נמצאים ב-`firestore.rules` ו-`storage.rules` ונפרסים אוטומטית בכל deploy.

- אפליקציה חיה: **https://car360-50b44.web.app**
- להחלפת פרויקט: עדכנו את `.env` ואת `.firebaserc`.

## פריסה אוטומטית (GitHub Actions)

כל push לענף הראשי מפעיל את `.github/workflows/deploy.yml`: build → פריסת Hosting + Firestore rules + Storage rules.

**הגדרה חד-פעמית** — צריך סוד אחד בריפו:

1. הריצו `npx firebase-tools login:ci` (בכל מכשיר עם דפדפן) והעתיקו את הטוקן.
2. ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret** בשם `FIREBASE_TOKEN`, והדביקו את הטוקן.

מאותו רגע — כל push עולה לאוויר לבד. פריסת חוקי Storage מדלגת אוטומטית כל עוד Storage לא הופעל בפרויקט.

## ארכיטקטורה

```
src/
├── types/          # מודל הדומיין (Car, ServiceRecord, InsuranceRecord, ...)
├── lib/            # utils, דחיסת תמונות, firebase bootstrap, מנוע תזכורות
├── data/           # שכבת הנתונים
│   ├── repo.ts     #   ממשק Repo — האפליקציה מדברת רק איתו
│   ├── localRepo.ts#   מימוש IndexedDB (מצב דמו/אופליין)
│   ├── firebaseRepo.ts # מימוש Firestore + Storage (נטען דינמית)
│   └── auth.ts     #   Google Sign-In / משתמש דמו
├── contexts/       # Theme, Toast, Auth, Cars (רכב פעיל)
├── components/
│   ├── ui.tsx      # מערכת עיצוב: Button, Input, Modal, ConfirmDialog, Sheet...
│   ├── icons.tsx   # אייקונים inline (בלי בקשות רשת)
│   ├── cars/       # קרוסלת רכבים (swipe), סילואטת ברירת מחדל
│   └── layout/     # AppShell (ניווט תחתון), PageHeader
└── pages/          # Login, Home, CarForm, Services, Insurance, Documents,
                    # Share, Reminders, Settings
```

### עקרונות

- **Repository pattern** — החלפת local/Firebase בלי לגעת ב-UI.
- **דחיסת תמונות בצד לקוח** (`lib/images.ts`): כל תמונה נדחסת ל-WebP‏ (~100–350KB) לפני שמירה — האפליקציה נשארת מהירה גם עם עשרות מסמכים.
- **תזכורות נגזרות** (`lib/reminders.ts`): טסט, רישיון, סיום ביטוח, טיפול הבא ובלוקים מסוג תאריך נאספים אוטומטית למסך תזכורות אחד + התראת דפדפן יומית.
- **בלוקי מידע חופשיים**: המשתמש מוסיף לכל רכב כרטיסי מידע משלו (טקסט/מספר/תאריך/טלפון/קישור), כולל תזכורת לתאריכים.
- **PWA**: התקנה למסך הבית, עבודה אופליין (precache + cache לתמונות ענן), התראות.
- **הגנות UX**: דיאלוג אישור לפני כל מחיקה, חסימת ניווט כשיש שינויים שלא נשמרו (`useUnsavedChanges`).

## סקריפטים

| פקודה | תיאור |
| --- | --- |
| `npm run dev` | שרת פיתוח |
| `npm run build` | בדיקת טיפוסים + build + service worker |
| `npm run preview` | הרצת ה-build המקומי |
| `npm run lint` | oxlint |
