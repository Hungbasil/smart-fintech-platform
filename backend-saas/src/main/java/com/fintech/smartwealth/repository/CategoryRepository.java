package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

	@Query("SELECT c FROM Category c WHERE c.user.id = :userId")
	List<Category> findByUserId(@Param("userId") UUID userId);

	@Query("SELECT c FROM Category c WHERE c.id = :id AND c.user.id = :userId")
	Optional<Category> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

	@Query("SELECT c FROM Category c WHERE c.user.id = :userId OR c.user IS NULL")
	List<Category> findAvailableForUser(@Param("userId") UUID userId);

	@Query("SELECT c FROM Category c WHERE c.id = :id AND (c.user.id = :userId OR c.user IS NULL)")
	Optional<Category> findAvailableById(@Param("id") UUID id, @Param("userId") UUID userId);

	@Query("SELECT c FROM Category c WHERE c.user.id = :userId AND c.name = :name")
	Optional<Category> findByUserIdAndName(@Param("userId") UUID userId, @Param("name") String name);
}
