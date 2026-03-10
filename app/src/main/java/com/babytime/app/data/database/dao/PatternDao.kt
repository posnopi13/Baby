package com.babytime.app.data.database.dao

import androidx.room.*
import com.babytime.app.data.database.entity.PatternEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PatternDao {

    @Query("SELECT * FROM patterns WHERE isActive = 1 ORDER BY displayOrder ASC, createdAt ASC")
    fun getAllActivePatterns(): Flow<List<PatternEntity>>

    @Query("SELECT * FROM patterns WHERE category = :category AND isActive = 1 ORDER BY displayOrder ASC")
    fun getPatternsByCategory(category: String): Flow<List<PatternEntity>>

    @Query("SELECT * FROM patterns WHERE id = :patternId")
    suspend fun getPatternById(patternId: Long): PatternEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertPattern(pattern: PatternEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertPatterns(patterns: List<PatternEntity>)

    @Update
    suspend fun updatePattern(pattern: PatternEntity)

    @Query("UPDATE patterns SET isActive = 0 WHERE id = :patternId AND isDefault = 0")
    suspend fun deactivateCustomPattern(patternId: Long)

    @Query("UPDATE patterns SET displayOrder = :order WHERE id = :patternId")
    suspend fun updateDisplayOrder(patternId: Long, order: Int)

    @Query("SELECT COUNT(*) FROM patterns WHERE isDefault = 1")
    suspend fun getDefaultPatternCount(): Int
}
