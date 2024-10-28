import cv2
import numpy as np
from skimage import exposure
from sklearn.metrics import mean_squared_error
import random
import sys
import os

def rgb_to_lab(image):
    return cv2.cvtColor(image, cv2.COLOR_RGB2LAB)

def apply_clahe(image, clipLimit=2.0, grid=(8, 8)):
    try:
        lab_image = rgb_to_lab(image)
        l_channel, a_channel, b_channel = cv2.split(lab_image)
        clahe = cv2.createCLAHE(clipLimit=clipLimit, tileGridSize=grid)
        l_channel = clahe.apply(l_channel)
        lab_img = cv2.merge((l_channel, a_channel, b_channel))
        return cv2.cvtColor(lab_img, cv2.COLOR_LAB2RGB)
    except cv2.error as e:
        print(f"OpenCV error: {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        raise

def evaluate_fitness(original_image, processed_image):
    mse = mean_squared_error(original_image.flatten(), processed_image.flatten())
    max_pixel = 255.0
    psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
    return psnr, mse

def generate_population(chromosome_length, population_size):
    return np.random.randint(0, 2, (population_size, chromosome_length))

def binary_to_decimal(binary):
    return int("".join(map(str, binary)), 2)

def decode_chromosome(chromosome):
    half_length = len(chromosome) // 2
    m = binary_to_decimal(chromosome[:half_length])
    n = binary_to_decimal(chromosome[half_length:])
    return m, n

def cfCalculate(fitness_val):
    return np.cumsum(fitness_val)

def chromosomeSelection(fitness_cf, population):
    dice = random.uniform(0, fitness_cf[-1])
    idx = np.searchsorted(fitness_cf, dice)
    return population[idx]

def generation_fitness(population, image):
    fitness = np.zeros(len(population))
    mse_array = []
    for i, chromosome in enumerate(population):
        m, n = decode_chromosome(chromosome)
        grid = (max(m, 2), max(n, 2))
        processed_img = apply_clahe(image, grid=grid)
        psnr, mse = evaluate_fitness(image, processed_img)
        fitness[i] = psnr
        mse_array.append(mse)
    return fitness, mse_array

def Crossover(parent1, parent2):
    point = random.randint(1, len(parent1) - 1)
    return (np.concatenate((parent1[:point], parent2[point:])), 
            np.concatenate((parent2[:point], parent1[point:])))

def NewGeneration(population, child1, child2):
    population[0], population[1] = child1, child2

def Mutation(population, mutation_rate=0.01):
    for i in range(len(population)):
        if random.random() < mutation_rate:
            mutation_point = random.randint(0, len(population[i]) - 1)
            population[i][mutation_point] = 1 - population[i][mutation_point]

def Algorithm(image, population_size, generations):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    max_m = image.shape[0] // 4
    max_n = image.shape[1] // 4
    chromosome_length = len(bin(max(max_m, max_n))[2:]) * 2
    population = generate_population(chromosome_length, population_size)

    for gen in range(generations):
        # Report progress
        progress = int((gen / generations) * 100)
        print(f"PROGRESS:{progress}")
        sys.stdout.flush()

        fitness_val, mse_array = generation_fitness(population, image)
        sorted_idx = np.argsort(fitness_val)
        population = population[sorted_idx]
        fitness_val = fitness_val[sorted_idx]
        
        parent1 = chromosomeSelection(cfCalculate(fitness_val), population)
        parent2 = chromosomeSelection(cfCalculate(fitness_val), population)
        child1, child2 = Crossover(parent1, parent2)
        NewGeneration(population, child1, child2)
        Mutation(population)

    # Final progress update
    print("PROGRESS:100")
    sys.stdout.flush()

    return apply_latest_clahe(image, population, population_size, max_m, max_n)

def apply_latest_clahe(image, population, population_size, max_m, max_n):
    latest_chromosome = population[-1]
    m, n = decode_chromosome(latest_chromosome)
    grid = (max(min(m, max_m), 2), max(min(n, max_n), 2))
    image = apply_clahe(image, grid=grid)

    cv2.imwrite("./proce_image.png", image)
    return image

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python process_image.py input_path output_path population_size generations", 
              file=sys.stderr)
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    population_size = int(sys.argv[3])
    generations = int(sys.argv[4])
    
    try:
        image = cv2.imread(input_path)
        if image is None:
            raise FileNotFoundError(f"Error loading image: {input_path}")
            
        result_img = Algorithm(image, population_size, generations)
        
        # Convert from RGB to BGR for saving
        # result_img = cv2.cvtColor((result_img * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
        cv2.imwrite(output_path, result_img)
        
    except Exception as e:
        print(f"Error processing image: {str(e)}", file=sys.stderr)
        sys.exit(1)