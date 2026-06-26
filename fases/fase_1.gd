extends Node2D

var time_elapsed := 0.0
var tempo_segundo
var finished := false

func _process(delta: float) -> void:
	# Increment time by the seconds passed since the last frame
	time_elapsed += delta
	tempo_segundo = int(time_elapsed)

	if finished == true:
		if tempo_segundo < 120:
			Global.add_coins(1)

		finished = false

	print(tempo_segundo)
	
