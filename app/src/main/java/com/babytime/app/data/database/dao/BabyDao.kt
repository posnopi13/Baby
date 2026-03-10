package com.babytime.app.data.database.dao

import androidx.room.*
import com.babytime.app.data.database.entity.BabyEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BabyDao {

    @Query("SELECT * FROM babies WHERE isActive = 1 ORDER BY createdAt ASC")
    fun getAllActiveBabies(): Flow<List<BabyEntity>>

    @Query("SELECT * FROM babies WHERE id = :babyId")
    fun getBabyById(babyId: Long): Flow<BabyEntity?>

    @Query("SELECT * FROM babies WHERE id = :babyId")
    suspend fun getBabyByIdOnce(babyId: Long): BabyEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBaby(baby: BabyEntity): Long

    @Update
    suspend fun updateBaby(baby: BabyEntity)

    @Query("UPDATE babies SET isActive = 0 WHERE id = :babyId")
    suspend fun deactivateBaby(babyId: Long)

    @Delete
    suspend fun deleteBaby(baby: BabyEntity)

    @Query("SELECT COUNT(*) FROM babies WHERE isActive = 1")
    suspend fun getActiveBabyCount(): Int
}
