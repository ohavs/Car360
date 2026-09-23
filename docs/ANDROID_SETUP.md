# Car360 לאנדרואיד: הגדרה חד-פעמית

שלושה דברים שרק לבעל הפרויקט יש גישה אליהם. אחרי שהם מוגדרים, כל push ל-`mobile/` בונה APK חתום ומפרסם אותו ב-[GitHub Releases](https://github.com/ohavs/Car360/releases), ומשם הוא מגיע לטלפון דרך **הגדרות ← עדכוני אפליקציה**.

## 1. Firebase: לרשום את אפליקציית האנדרואיד

1. [Firebase Console](https://console.firebase.google.com/project/car360-50b44/settings/general) ← **Project settings** ← **Your apps** ← **Add app** ← אייקון אנדרואיד.
2. **Android package name:** `com.ohavs.car360`. ‏App nickname: ‏`Car360 Android`. אפשר לדלג על השאר עד סוף האשף.
3. באותו מסך, תחת האפליקציה החדשה ← **Add fingerprint**. מוסיפים את שתי טביעות האצבע של מפתח החתימה:

   ```
   SHA-1:   46:DA:FC:F0:07:54:ED:2F:64:0D:35:41:C2:59:58:CF:64:5B:11:89
   SHA-256: 1F:59:44:41:2A:29:DA:13:F2:78:B6:08:6C:D3:FF:9C:D8:92:E2:25:9D:30:3A:BA:1F:ED:2E:67:4E:CB:88:A2
   ```

   בלי זה הכניסה עם Google נכשלת עם `DEVELOPER_ERROR`.
4. **רק אחרי** הוספת הטביעות: להוריד את `google-services.json` (כפתור ההורדה ליד האפליקציה). אם מורידים אותו לפני כן, חסר בו הרישום של Google Sign-In.

## 2. GitHub: חמישה סודות

[Settings ← Secrets and variables ← Actions](https://github.com/ohavs/Car360/settings/secrets/actions) ← **New repository secret**:

| שם | ערך |
| --- | --- |
| `GOOGLE_SERVICES_JSON` | כל התוכן של `google-services.json` משלב 1 (להדביק כמו שהוא) |
| `ANDROID_KEYSTORE_BASE64` | מהקובץ `car360-github-secrets.txt` שקיבלת |
| `ANDROID_KEYSTORE_PASSWORD` | מאותו קובץ |
| `ANDROID_KEY_ALIAS` | `car360` |
| `ANDROID_KEY_PASSWORD` | מאותו קובץ |

את `car360-release.jks` ואת `car360-github-secrets.txt` שומרים גם במקום בטוח מחוץ ל-GitHub (מנהל סיסמאות או Drive פרטי). כל גרסה חייבת להיחתם באותו מפתח, אחרת אנדרואיד מסרב לעדכן. **הריפו ציבורי, לכן אסור להעלות אותם אליו.**

## 3. בנייה והתקנה ראשונה

1. [Actions ← Android](https://github.com/ohavs/Car360/actions/workflows/android.yml) ← **Run workflow** (או כל push שנוגע ב-`mobile/`).
2. כשהבנייה מסתיימת, ב-[Releases](https://github.com/ohavs/Car360/releases) מופיעה גרסה חדשה עם קובץ `car360-….apk`.
3. **בטלפון:** לפתוח את הדף, להוריד את ה-APK, ולאשר "התקנה ממקור לא ידוע" לדפדפן. זו ההתקנה הידנית היחידה.
4. מכאן והלאה: **הגדרות ← עדכוני אפליקציה ← עדכון עכשיו**. בפעם הראשונה אנדרואיד יבקש אישור חד-פעמי "התרה ממקור זה" עבור Car360, והעדכון ימשיך לבד.

## איך זה בנוי

| מה | איפה |
| --- | --- |
| האפליקציה (Expo / React Native) | `mobile/` |
| הבנייה והפרסום | `.github/workflows/android.yml` |
| מודול ההתקנה (Kotlin, PackageInstaller) | `mobile/modules/app-updater/` |
| חתימה מתוך הסודות | `mobile/plugins/withReleaseSigning.js` |
| קובץ `latest.json` שהאפליקציה קוראת | `mobile/scripts/release-manifest.mjs` |

- **ערוצים:** בנייה של `main` היא גרסה יציבה. בנייה של כל branch אחר היא pre-release (בטא). אפליקציה שנבנתה מ-branch מתעדכנת גם מבטא וגם מיציבה, ואפליקציה שנבנתה מ-`main` רק מיציבה.
- **בלי הסודות:** ה-CI עדיין בונה (עם חתימת debug ו-Firebase מדומה) ושומר את ה-APK כ-artifact לבדיקה, אבל לא מפרסם Release.
