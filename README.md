# Car360 — ניהול הרכבים שלי 🚗

אפליקציית Web (PWA) לניהול כל מה שמסביב לרכב: טיפולים, ביטוחים, מסמכים, תזכורות ושיתוף עם בני משפחה — בעברית, Mobile-First, עם מצב כהה/בהיר.

## הרצה מקומית

```bash
npm install
npm run dev
```

בלי שום הגדרה נוספת האפליקציה עולה ב**מצב דמו מקומי**: הנתונים נשמרים ב-IndexedDB על המכשיר, וכפתור "כניסה עם Google" יוצר משתמש דמו. זה מאפשר לחוות את כל האפליקציה מיד.

## חיבור Firebase (כניסת Google אמיתית, סנכרון ושיתוף)

1. צרו פרויקט ב-[Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → הפעילו **Google**.
3. **Firestore Database** → צרו מסד (production mode) → העתיקו את הכללים מ-`firestore.rules`.
4. **Storage** → הפעילו → העתיקו את הכללים מ-`storage.rules`.
5. **Project settings → Your apps** → הוסיפו Web App והעתיקו את הקונפיגורציה.
6. העתיקו את `.env.example` ל-`.env.local` ומלאו את הערכים.
7. `npm run build && npm run preview` (או פריסה ל-Firebase Hosting / Vercel / Netlify).

ברגע שהקונפיגורציה קיימת, האפליקציה עוברת אוטומטית למצב ענן — אין שינוי קוד.

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
