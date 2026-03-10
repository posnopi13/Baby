package com.babytime.app.data.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "babies")
data class BabyEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val nickname: String = "",
    val birthDate: Long, // timestamp in milliseconds
    val gender: String = "UNKNOWN", // MALE, FEMALE, UNKNOWN
    val photoUri: String = "",
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)
