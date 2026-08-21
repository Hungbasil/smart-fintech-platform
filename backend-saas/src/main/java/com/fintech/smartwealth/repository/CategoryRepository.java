package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

	List<Category> findByUserId(UUID userId);

	Optional<Category> findByIdAndUserId(UUID id, UUID userId);
}
