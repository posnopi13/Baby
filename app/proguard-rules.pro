# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /path-to/android-sdk/tools/proguard/proguard-android.txt

# Keep Room entities
-keep class com.babytime.app.data.database.entity.** { *; }

# Keep data classes used by Room
-keepclassmembers class * {
    @androidx.room.* <fields>;
    @androidx.room.* <methods>;
}

# Hilt
-keepnames @dagger.hilt.android.lifecycle.HiltViewModel class * extends androidx.lifecycle.ViewModel

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
