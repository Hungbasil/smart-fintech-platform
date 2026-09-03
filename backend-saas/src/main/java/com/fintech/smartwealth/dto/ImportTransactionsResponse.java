package com.fintech.smartwealth.dto;

import java.util.List;

public record ImportTransactionsResponse(int imported, int skippedDuplicates, List<String> errors) {}
