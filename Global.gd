extends Node

# O sinal que avisa o resto do jogo que a quantidade de moedas mudou
signal coins_changed(new_amount)

# A variável privada que guarda as moedas
var _total_coins: int = 0

# Função para adicionar moedas (evita valores negativos por acidente)
func add_coins(amount: int) -> void:
	if amount > 0:
		_total_coins += amount
		coins_changed.emit(_total_coins)

# Função para gastar moedas (retorna true se a compra deu certo)
func spend_coins(amount: int) -> bool:
	if amount <= _total_coins and amount > 0:
		_total_coins -= amount
		coins_changed.emit(_total_coins)
		return true
	return false

# Função para apenas ler a quantidade atual de moedas
func get_coins() -> int:
	return _total_coins
